'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  FileText,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Wand2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { completeGenerate, streamGenerate } from '@/lib/ai/openrouter-client';
import { DEFAULT_AI_OPTIONS, normalizeAiDraftOptions, type AiOptions } from '@/hooks/aiDraftOptions';
import type {
  AssistantDraftPayload,
  AssistantMessage,
  AssistantMode,
  AssistantPersistedSession
} from '@/types/ai-assistant';

interface AIAssistantButtonProps {
  documentId: string;
  documentTitle: string;
  getContextWindow: () => string;
  getSelectedText: () => string;
  insertAtCursor: (text: string) => void;
  replaceSelection: (text: string) => boolean;
  onImproveWriting?: () => void;
  onSummarize?: () => Promise<string>;
  onGenerateTitle?: () => void;
  openRequest?: { intent: AssistantMode; nonce: number } | null;
  onOpenRequestHandled?: () => void;
}

type SuggestedTool = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
};

const MESSAGE_LIMIT = 40;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function trimMessages(messages: AssistantMessage[]): AssistantMessage[] {
  return messages.slice(-MESSAGE_LIMIT);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>'
  );
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\n/g, '<br />');
  return out;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) i++;
      html.push(
        `<pre class="overflow-x-auto rounded-lg bg-muted/70 p-3"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length);
      html.push(`<h${level} class="font-semibold mt-3 mb-1">${formatInlineMarkdown(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    const ulMatch = line.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(`<li>${formatInlineMarkdown(match[1])}</li>`);
        i++;
      }
      html.push(`<ul class="list-disc pl-5 space-y-1">${items.join('')}</ul>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = lines[i].match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(`<li>${formatInlineMarkdown(match[1])}</li>`);
        i++;
      }
      html.push(`<ol class="list-decimal pl-5 space-y-1">${items.join('')}</ol>`);
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      const currentTrimmed = current.trim();
      if (
        !currentTrimmed ||
        currentTrimmed.startsWith('```') ||
        /^(#{1,6})\s+/.test(current) ||
        /^[-*+]\s+/.test(current) ||
        /^\d+\.\s+/.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      i++;
    }
    html.push(`<p>${formatInlineMarkdown(paragraph.join('\n'))}</p>`);
  }

  return html.join('');
}

function MarkdownMessage({ text }: { text: string }) {
  const html = markdownToHtml(text);
  return (
    <div
      className="text-sm leading-relaxed whitespace-normal space-y-2 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function normalizeAiErrorMessage(raw: string): string {
  const value = raw || 'Failed to get a response. Please try again.';
  const lower = value.toLowerCase();
  if (lower.includes('429') || lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many requests, retry in a moment.';
  }
  if (lower.includes('failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lower.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  return value;
}

function isAbortLikeError(raw: string): boolean {
  const lower = raw.toLowerCase();
  return lower.includes('abort') || lower.includes('aborted');
}

function isValidMode(value: unknown): value is AssistantMode {
  return value === 'chat' || value === 'draft';
}

function toMessageRole(sender: AssistantMessage['sender']): string {
  if (sender === 'user') return 'User';
  if (sender === 'assistant') return 'Assistant';
  return 'System';
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  documentId,
  documentTitle,
  getContextWindow,
  getSelectedText,
  insertAtCursor,
  replaceSelection,
  onImproveWriting,
  onSummarize,
  onGenerateTitle,
  openRequest,
  onOpenRequestHandled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('chat');
  const [draftOptions, setDraftOptions] = useState<AiOptions>(() => {
    if (typeof window === 'undefined') return DEFAULT_AI_OPTIONS;
    try {
      const raw = window.localStorage.getItem('ai:draft:opts');
      if (raw) return normalizeAiDraftOptions(JSON.parse(raw));
    } catch {}
    return DEFAULT_AI_OPTIONS;
  });
  const [lastDraftPayload, setLastDraftPayload] = useState<AssistantDraftPayload | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const activeSessionRef = useRef(0);
  const stopDraftRef = useRef<() => void>(() => {});
  const hydratedRef = useRef(false);

  const storageKey = useMemo(() => `ai:assistant:doc:${documentId}`, [documentId]);

  const appendMessage = useCallback((message: AssistantMessage) => {
    setMessages((prev) => trimMessages([...prev, message]));
  }, []);

  const updateMessage = useCallback((id: string, updater: (message: AssistantMessage) => AssistantMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? updater(message) : message)));
  }, []);

  const getDraftContext = useCallback((includeContext: boolean): string | undefined => {
    if (!includeContext) return undefined;
    const around = getContextWindow().trim();
    const selected = getSelectedText().trim();
    const parts = [
      `Title: ${documentTitle || 'Untitled'}`,
      around ? `Context:\n${around}` : '',
      selected ? `Selected text:\n${selected}` : '',
    ].filter(Boolean);
    return parts.length ? parts.join('\n\n') : undefined;
  }, [documentTitle, getContextWindow, getSelectedText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showQuickActions &&
        toolsRef.current &&
        !toolsRef.current.contains(event.target as Node) &&
        toolsButtonRef.current &&
        !toolsButtonRef.current.contains(event.target as Node)
      ) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuickActions]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!openRequest) return;
    setMode(openRequest.intent);
    setIsOpen(true);
    onOpenRequestHandled?.();
  }, [openRequest, onOpenRequestHandled]);

  useEffect(() => {
    stopDraftRef.current?.();
    setMessages([]);
    setMode('chat');
    setLastDraftPayload(null);
    setInputValue('');
    hydratedRef.current = false;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as Partial<AssistantPersistedSession>;
      if (!parsed || parsed.version !== 1 || typeof parsed.savedAt !== 'number') {
        window.localStorage.removeItem(storageKey);
        hydratedRef.current = true;
        return;
      }
      if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
        window.localStorage.removeItem(storageKey);
        hydratedRef.current = true;
        return;
      }
      const restoredMessages = Array.isArray(parsed.messages)
        ? parsed.messages.filter((message): message is AssistantMessage => {
            return (
              !!message &&
              typeof message.id === 'string' &&
              typeof message.text === 'string' &&
              (message.sender === 'assistant' || message.sender === 'user' || message.sender === 'system') &&
              typeof message.timestamp === 'number'
            );
          })
        : [];
      setMessages(trimMessages(restoredMessages));
      setMode(isValidMode(parsed.mode) ? parsed.mode : 'chat');
      setLastDraftPayload(parsed.lastDraftPayload ?? null);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      hydratedRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const session: AssistantPersistedSession = {
      version: 1,
      savedAt: Date.now(),
      mode,
      messages: trimMessages(messages),
      lastDraftPayload,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } catch {}
  }, [lastDraftPayload, messages, mode, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ai:draft:opts', JSON.stringify(draftOptions));
    } catch {}
  }, [draftOptions]);

  const buildConversationContext = useCallback((history: AssistantMessage[]): string => {
    const recent = history.slice(-12);
    const conversation = recent
      .map((message) => `${toMessageRole(message.sender)}: ${message.text}`)
      .join('\n');
    const around = getContextWindow().trim();
    return [
      `Title: ${documentTitle || 'Untitled'}`,
      around ? `Document context:\n${around}` : '',
      conversation ? `Conversation:\n${conversation}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [documentTitle, getContextWindow]);

  const runDraft = useCallback(async (payload: AssistantDraftPayload, targetMessageId?: string, includePromptMessage = true) => {
    if (isTyping) return;
    if (!payload.prompt.trim()) return;
    if (!isOnline) {
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'error',
        text: 'Offline. Reconnect to generate AI drafts.',
        timestamp: Date.now(),
      });
      return;
    }

    setMode('draft');
    setIsTyping(true);
    setLastDraftPayload(payload);

    if (includePromptMessage) {
      appendMessage({
        id: createMessageId(),
        sender: 'user',
        kind: 'chat',
        text: payload.prompt,
        timestamp: Date.now(),
      });
    }

    const draftId = targetMessageId ?? createMessageId();
    if (targetMessageId) {
      updateMessage(targetMessageId, (message) => ({
        ...message,
        text: '',
        kind: 'draft_result',
        draftPayload: payload,
        timestamp: Date.now(),
      }));
    } else {
      appendMessage({
        id: draftId,
        sender: 'assistant',
        kind: 'draft_result',
        text: '',
        timestamp: Date.now(),
        draftPayload: payload,
      });
    }

    let stoppedByUser = false;
    const { stop, promise } = streamGenerate(
      'draft',
      {
        prompt: payload.prompt,
        mode: 'draft',
        tone: payload.options.tone,
        length: payload.options.length,
        temperature: payload.options.temperature,
        context: payload.context,
      },
      undefined,
      {
        onToken: (token) => {
          updateMessage(draftId, (message) => ({ ...message, text: `${message.text}${token}` }));
        },
        onDone: () => {
          setIsTyping(false);
          stopDraftRef.current = () => {};
        },
        onError: (rawError) => {
          const errorMessage = normalizeAiErrorMessage(rawError);
          setIsTyping(false);
          stopDraftRef.current = () => {};
          if (stoppedByUser || isAbortLikeError(rawError)) {
            appendMessage({
              id: createMessageId(),
              sender: 'system',
              kind: 'system',
              text: 'Draft generation stopped. You can regenerate from the draft card.',
              timestamp: Date.now(),
            });
            return;
          }
          appendMessage({
            id: createMessageId(),
            sender: 'system',
            kind: 'error',
            text: errorMessage,
            timestamp: Date.now(),
          });
        },
      }
    );

    stopDraftRef.current = () => {
      stoppedByUser = true;
      stop();
    };

    await promise;
  }, [appendMessage, isOnline, isTyping, updateMessage]);

  const runDraftFromPrompt = useCallback(async (prompt: string) => {
    const payload: AssistantDraftPayload = {
      prompt,
      context: getDraftContext(draftOptions.includeContext),
      options: draftOptions,
    };
    await runDraft(payload);
  }, [draftOptions, getDraftContext, runDraft]);

  const handleSendMessage = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isTyping) return;
    if (!isOnline) {
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'error',
        text: 'Offline. Reconnect to continue.',
        timestamp: Date.now(),
      });
      return;
    }

    setInputValue('');

    if (mode === 'draft') {
      await runDraftFromPrompt(prompt);
      return;
    }

    const history = [...messages];
    const sessionId = activeSessionRef.current;

    appendMessage({
      id: createMessageId(),
      text: prompt,
      sender: 'user',
      kind: 'chat',
      timestamp: Date.now(),
    });
    setIsTyping(true);

    try {
      const context = buildConversationContext(history);
      const response = (await completeGenerate('chat', { prompt, context: context || undefined })).trim();
      if (sessionId !== activeSessionRef.current) return;
      appendMessage({
        id: createMessageId(),
        text: response || 'I could not generate a response right now.',
        sender: 'assistant',
        kind: 'chat',
        timestamp: Date.now(),
      });
    } catch (error) {
      if (sessionId !== activeSessionRef.current) return;
      const message = normalizeAiErrorMessage(error instanceof Error ? error.message : '');
      appendMessage({
        id: createMessageId(),
        text: message,
        sender: 'system',
        kind: 'error',
        timestamp: Date.now(),
      });
    } finally {
      if (sessionId !== activeSessionRef.current) return;
      setIsTyping(false);
    }
  }, [appendMessage, buildConversationContext, inputValue, isOnline, isTyping, messages, mode, runDraftFromPrompt]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSummarize = useCallback(async () => {
    if (isTyping) return;
    const sessionId = activeSessionRef.current;
    appendMessage({
      id: createMessageId(),
      text: 'Summarize this note.',
      sender: 'user',
      kind: 'chat',
      timestamp: Date.now(),
    });
    setIsTyping(true);

    try {
      if (!onSummarize) throw new Error('Summarize is currently unavailable.');
      const summary = (await onSummarize()).trim();
      if (sessionId !== activeSessionRef.current) return;
      appendMessage({
        id: createMessageId(),
        text: summary || 'I could not generate a summary right now.',
        sender: 'assistant',
        kind: 'chat',
        timestamp: Date.now(),
      });
    } catch (error) {
      if (sessionId !== activeSessionRef.current) return;
      appendMessage({
        id: createMessageId(),
        text: normalizeAiErrorMessage(error instanceof Error ? error.message : ''),
        sender: 'system',
        kind: 'error',
        timestamp: Date.now(),
      });
    } finally {
      if (sessionId !== activeSessionRef.current) return;
      setIsTyping(false);
    }
  }, [appendMessage, isTyping, onSummarize]);

  const stopGeneratingDraft = useCallback(() => {
    stopDraftRef.current?.();
  }, []);

  const handleInsertAtCursor = useCallback((message: AssistantMessage) => {
    if (!message.text.trim()) return;
    insertAtCursor(message.text);
    appendMessage({
      id: createMessageId(),
      sender: 'system',
      kind: 'system',
      text: 'Inserted draft at cursor.',
      timestamp: Date.now(),
    });
  }, [appendMessage, insertAtCursor]);

  const handleReplaceSelection = useCallback((message: AssistantMessage) => {
    if (!message.text.trim()) return;
    const replaced = replaceSelection(message.text);
    if (!replaced) {
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'error',
        text: 'No editable selection found. Select text first, or insert at cursor.',
        timestamp: Date.now(),
      });
      return;
    }
    appendMessage({
      id: createMessageId(),
      sender: 'system',
      kind: 'system',
      text: 'Replaced current selection with draft.',
      timestamp: Date.now(),
    });
  }, [appendMessage, replaceSelection]);

  const handleCopyDraft = useCallback(async (message: AssistantMessage) => {
    if (!message.text.trim()) return;
    try {
      await navigator.clipboard.writeText(message.text);
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'system',
        text: 'Draft copied to clipboard.',
        timestamp: Date.now(),
      });
    } catch {
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'error',
        text: 'Copy failed. Please copy manually from the draft card.',
        timestamp: Date.now(),
      });
    }
  }, [appendMessage]);

  const handleRegenerateDraft = useCallback((message: AssistantMessage) => {
    const payload = message.draftPayload ?? lastDraftPayload;
    if (!payload) {
      appendMessage({
        id: createMessageId(),
        sender: 'system',
        kind: 'error',
        text: 'No draft payload available to regenerate.',
        timestamp: Date.now(),
      });
      return;
    }
    void runDraft(payload, message.id, false);
  }, [appendMessage, lastDraftPayload, runDraft]);

  const clearChat = useCallback(() => {
    stopDraftRef.current?.();
    activeSessionRef.current += 1;
    setMessages([]);
    setInputValue('');
    setShowQuickActions(false);
    setIsTyping(false);
    setLastDraftPayload(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const suggestedTools: SuggestedTool[] = [
    {
      icon: <FileText size={16} />,
      label: 'AI Draft',
      description: 'Generate content in your note',
      onClick: () => {
        setMode('draft');
        setIsOpen(true);
      },
      disabled: isTyping || !isOnline,
    },
    {
      icon: <FileText size={16} />,
      label: 'Summarize',
      description: 'Summarize this note',
      onClick: () => {
        void handleSummarize();
      },
      disabled: isTyping || !isOnline,
    },
    {
      icon: <Sparkles size={16} />,
      label: 'Generate Title',
      description: 'Auto-generate a title for this note',
      onClick: () => {
        onGenerateTitle?.();
      },
      disabled: isTyping || !isOnline,
    },
    {
      icon: <Wand2 size={16} />,
      label: 'Improve Writing',
      description: 'Improve selected text',
      onClick: () => {
        onImproveWriting?.();
      },
      disabled: isTyping || !isOnline,
    },
  ];

  const inputPlaceholder = mode === 'draft'
    ? 'Describe what you want to draft...'
    : 'Ask me anything...';

  const hasSelection = Boolean(getSelectedText().trim());

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className={`fixed bottom-6 right-6 w-14 h-14 bg-primary hover:opacity-90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${isOpen ? 'z-[60]' : 'z-40'}`}
              aria-label="AI Assistant"
            >
              <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Mosaic AI</p>
          </TooltipContent>
        </Tooltip>

        {isOpen && (
          <div
            ref={containerRef}
            className={`fixed bg-card rounded-2xl shadow-2xl border border-border flex flex-col z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isExpanded
                ? 'inset-3 sm:inset-6'
                : 'bottom-24 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[420px] h-[72vh] sm:h-[520px]'
            }`}
          >
            <div className="flex-shrink-0 border-b border-border p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span className="font-semibold text-foreground">
                    AI Assistant
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearChat}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Clear chat"
                    aria-label="Clear chat"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="relative">
                    <button
                      ref={toolsButtonRef}
                      onClick={() => setShowQuickActions((prev) => !prev)}
                      className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={showQuickActions ? 'Hide tools' : 'Show tools'}
                      aria-label={showQuickActions ? 'Hide tools' : 'Show tools'}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    {showQuickActions && (
                      <div
                        ref={toolsRef}
                        className="absolute right-0 top-9 w-72 rounded-xl border border-border bg-card shadow-xl z-20 p-2 space-y-1"
                      >
                        <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Quick actions</div>
                        {suggestedTools.map((tool, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setShowQuickActions(false);
                              tool.onClick();
                            }}
                            disabled={tool.disabled}
                            className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title={tool.label}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 text-muted-foreground">{tool.icon}</div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">{tool.label}</div>
                                {tool.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">{tool.description}</div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setMode((prev) => (prev === 'chat' ? 'draft' : 'chat'))}
                    className="h-7 rounded-md border border-border px-2 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Switch mode"
                    aria-label="Switch mode"
                  >
                    {mode}
                  </button>
                  <button
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={isExpanded ? 'Exit expanded view' : 'Expand'}
                    aria-label={isExpanded ? 'Exit expanded view' : 'Expand'}
                  >
                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Minimize assistant"
                    aria-label="Minimize assistant"
                  >
                    <Minus size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Document: {documentTitle || 'Untitled'}</span>
                {!isOnline && <span className="text-destructive">Offline</span>}
              </div>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={24} className="text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      {mode === 'draft' ? 'Describe the draft you want to generate' : 'How can I help with this note?'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Use the tools button to switch actions.</p>
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const isDraftCard = message.kind === 'draft_result';
                const isError = message.kind === 'error';
                const bubbleClass = message.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : isError
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                    : 'bg-muted text-foreground';

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[90%] px-4 py-2 rounded-2xl ${bubbleClass}`}>
                      {message.sender === 'assistant' || message.sender === 'system' ? (
                        <MarkdownMessage text={message.text || (isDraftCard ? 'Generating draft…' : '')} />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      )}

                      {isDraftCard && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleInsertAtCursor(message)}
                            disabled={!message.text.trim() || isTyping}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Insert at cursor
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplaceSelection(message)}
                            disabled={!message.text.trim() || !hasSelection || isTyping}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Replace selection
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyDraft(message)}
                            disabled={!message.text.trim()}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Copy size={12} />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateDraft(message)}
                            disabled={isTyping || !isOnline}
                            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <RefreshCw size={12} />
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    {mode === 'draft' && (
                      <button
                        type="button"
                        onClick={stopGeneratingDraft}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/70 flex items-center gap-1"
                      >
                        <Square size={12} />
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-border p-3 space-y-2">
              {mode === 'draft' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                    <span>Tone</span>
                    <select
                      className="bg-transparent text-xs outline-none"
                      value={draftOptions.tone}
                      onChange={(event) => setDraftOptions((prev) => ({ ...prev, tone: event.target.value as AiOptions['tone'] }))}
                    >
                      <option value="neutral">Neutral</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                    <span>Length</span>
                    <select
                      className="bg-transparent text-xs outline-none"
                      value={draftOptions.length}
                      onChange={(event) => setDraftOptions((prev) => ({ ...prev, length: event.target.value as AiOptions['length'] }))}
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </label>
                  <label className="col-span-2 flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                    <span>Use surrounding context</span>
                    <input
                      type="checkbox"
                      checked={draftOptions.includeContext}
                      onChange={(event) => setDraftOptions((prev) => ({ ...prev, includeContext: event.target.checked }))}
                    />
                  </label>
                  <label className="col-span-2 flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                    <span>Creativity ({draftOptions.temperature.toFixed(2)})</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={draftOptions.temperature}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setDraftOptions((prev) => ({ ...prev, temperature: Number.isFinite(value) ? value : prev.temperature }));
                      }}
                      className="w-28"
                    />
                  </label>
                </div>
              )}

              {!isOnline && (
                <div className="text-xs text-destructive">Offline. AI actions are disabled until reconnect.</div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping || !isOnline}
                  className="w-9 h-9 bg-primary hover:opacity-90 disabled:bg-muted text-primary-foreground rounded-lg flex items-center justify-center transition-colors disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </TooltipProvider>
  );
};
