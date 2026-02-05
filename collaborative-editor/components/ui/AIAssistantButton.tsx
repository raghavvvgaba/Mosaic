'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Languages, FileText, Zap, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface AIAssistantButtonProps {
  onImproveWriting?: () => void;
  onSummarize?: () => void;
  onTranslate?: () => void;
  onBrainstorm?: () => void;
  onAskAI?: () => void;
  onAIDraft?: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  onImproveWriting,
  onSummarize,
  onTranslate,
  onBrainstorm,
  onAskAI,
  onAIDraft,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm your AI assistant! I can help you improve your writing, generate content, translate text, and more. What would you like to do?",
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const featureButtons = [
    {
      icon: <FileText size={16} />,
      label: 'AI Draft',
      onClick: () => {
        onAIDraft?.();
        setIsOpen(false);
      },
    },
    {
      icon: <FileText size={16} />,
      label: 'Summarize',
      onClick: () => {
        onSummarize?.();
        setInputValue('Summarize the following:');
      },
    },
    {
      icon: <Wand2 size={16} />,
      label: 'Improve Writing',
      onClick: () => {
        onImproveWriting?.();
        setIsOpen(false);
      },
    },
    {
      icon: <Languages size={16} />,
      label: 'Translate',
      onClick: () => {
        onTranslate?.();
        setInputValue('Help me translate this text:');
      },
    },
    {
      icon: <Zap size={16} />,
      label: 'Brainstorm',
      onClick: () => {
        onBrainstorm?.();
        setInputValue('Help me brainstorm ideas for:');
      },
    },
    {
      icon: <MessageSquare size={16} />,
      label: 'Ask AI',
      onClick: () => {
        onAskAI?.();
        setInputValue('I have a question:');
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
          className="fixed bottom-24 right-6 w-[400px] h-[500px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header with Feature Buttons */}
          <div className="flex-shrink-0 border-b border-border p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <span className="font-semibold text-foreground">AI Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Feature Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {featureButtons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.onClick}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors group"
                  title={button.label}
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    {button.icon}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {button.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={24} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  How can I help you with your notes?
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
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
