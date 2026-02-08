'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, FileText, Send, Loader2, Trash2, Maximize2, Minimize2, LayoutGrid, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { completeGenerate } from '@/lib/ai/openrouter-client';

interface AIAssistantButtonProps {
  onImproveWriting?: () => void;
  onSummarize?: () => Promise<string>;
  onAIDraft?: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

type SuggestedTool = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
};

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  onImproveWriting,
  onSummarize,
  onAIDraft,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const chatSessionRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close tools dropdown if clicking outside of it and its toggle button
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
    // Scroll to bottom when new messages are added
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Focus input when chat opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const buildConversationContext = (history: Message[]): string => {
    if (history.length === 0) return '';
    return history
      .map((message) => `${message.sender === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
      .join('\n');
  };

  const handleSendMessage = async () => {
    const prompt = inputValue.trim();
    if (!prompt || isTyping) return;
    const history = [...messages];
    const sessionId = chatSessionRef.current;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const context = buildConversationContext(history);
      const response = (await completeGenerate('chat', { prompt, context: context || undefined })).trim();
      if (sessionId !== chatSessionRef.current) return;
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response || 'I could not generate a response right now.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if (sessionId !== chatSessionRef.current) return;
      const message = error instanceof Error ? error.message : 'Failed to get a response. Please try again.'
      const assistantError: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantError]);
    } finally {
      if (sessionId !== chatSessionRef.current) return;
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSummarize = async () => {
    if (isTyping) return;
    const sessionId = chatSessionRef.current;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: 'Summarize this note.',
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      if (!onSummarize) {
        throw new Error('Summarize is currently unavailable.')
      }

      const summary = (await onSummarize()).trim();
      if (sessionId !== chatSessionRef.current) return;
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: summary || 'I could not generate a summary right now.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      if (sessionId !== chatSessionRef.current) return;
      const message = error instanceof Error ? error.message : 'Failed to summarize this note. Please try again.'
      const assistantError: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantError]);
    } finally {
      if (sessionId !== chatSessionRef.current) return;
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    chatSessionRef.current += 1;
    setMessages([]);
    setInputValue('');
    setShowQuickActions(false);
    setIsTyping(false);
  };

  const suggestedTools: SuggestedTool[] = [
    {
      icon: <FileText size={16} />,
      label: 'AI Draft',
      description: 'Generate content in your note',
      onClick: () => {
        onAIDraft?.();
        setIsOpen(false);
      },
    },
    {
      icon: <FileText size={16} />,
      label: 'Summarize',
      description: 'Summarize this note',
      onClick: () => {
        void handleSummarize();
      },
      disabled: isTyping,
    },
    {
      icon: <Wand2 size={16} />,
      label: 'Improve Writing',
      description: 'Improve selected text',
      onClick: () => {
        onImproveWriting?.();
        setIsOpen(false);
      },
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <>
        {/* Floating Action Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsOpen(!isOpen)}
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

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={containerRef}
          className={`fixed bg-card rounded-2xl shadow-2xl border border-border flex flex-col z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            isExpanded
              ? 'inset-3 sm:inset-6'
              : 'bottom-24 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[70vh] sm:h-[500px]'
          }`}
        >
          {/* Header with Feature Buttons */}
          <div className="flex-shrink-0 border-b border-border p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <span className="font-semibold text-foreground">AI Assistant</span>
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
          </div>

          {/* Chat Area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <p className="text-base font-semibold text-foreground">How can I help with this note?</p>
                  <p className="text-sm text-muted-foreground mt-1">Use the tools button to see available actions.</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
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
