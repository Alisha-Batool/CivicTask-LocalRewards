import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Trash2, 
  Minimize2, 
  Maximize2,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { apiFetch } from '../../lib/api-client.ts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatApiResponse {
  success: boolean;
  reply: string;
  model: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'How can I earn reward points?',
  'Find volunteering opportunities for me.',
  'How do I submit task proof?',
  'How can I redeem my rewards?',
];

export function CivicTaskChatWidget() {
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState(false);

  // Initialize conversation with welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: "Hi! I'm your CivicTask AI Assistant. How can I help you make a difference today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && user) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized, user]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: now,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);
    setIsServiceUnavailable(false);

    try {
      // Format messages history for the API (only user and assistant roles)
      const payloadMessages = newMessages
        .filter((m) => m.id !== 'welcome_1')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // If only the welcome message was there, ensure we send at least the current user message
      const messagesForApi = payloadMessages.length > 0 
        ? payloadMessages 
        : [{ role: 'user', content: text }];

      const response = await apiFetch<ChatApiResponse>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          messages: messagesForApi,
        }),
      });

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const msg = err.message || 'Failed to communicate with AI Assistant.';
      setErrorMessage(msg);
      if (
        msg.includes('503') || 
        msg.toLowerCase().includes('ollama') || 
        msg.toLowerCase().includes('unreachable')
      ) {
        setIsServiceUnavailable(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_1',
        role: 'assistant',
        content: "Hi! I'm your CivicTask AI Assistant. How can I help you make a difference today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);
    setIsServiceUnavailable(false);
  };

  return (
    <>
      {/* Floating Trigger Button (when chat is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open CivicTask AI Assistant"
          className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white rounded-full shadow-2xl hover:shadow-emerald-900/30 hover:scale-105 transition-all duration-200 flex items-center gap-2.5 group cursor-pointer border border-emerald-500/30"
        >
          <div className="relative">
            <BrainCircuit className="w-6 h-6 text-emerald-300 group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline-block">
            AI Assistant
          </span>
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-full sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 ${
            isMinimized ? 'h-16' : 'h-[580px] max-h-[85vh]'
          }`}
          role="region"
          aria-label="CivicTask AI Assistant chat window"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold leading-tight">CivicTask AI Assistant</h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Qwen2.5
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  {user ? `Active for ${profile?.name || user.email}` : 'Community service guide'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isMinimized && messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  aria-label="Clear chat"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close chat"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body (hidden if minimized) */}
          {!isMinimized && (
            <>
              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-1.5 max-w-[85%]">
                        {!isUser && (
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mb-1 border border-emerald-200">
                            <Sparkles className="w-3 h-3 text-emerald-700" />
                          </div>
                        )}

                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? 'bg-slate-900 text-white rounded-br-xs shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {isUser && (
                          <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mb-1">
                            <User className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-slate-400 font-mono mt-1 px-8 tabular-nums">
                        {msg.timestamp}
                      </span>
                    </div>
                  );
                })}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                      <Sparkles className="w-3 h-3 text-emerald-700 animate-spin" />
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs text-xs text-slate-600 flex items-center gap-2 shadow-xs">
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-700" />
                      <span>Qwen2.5 is thinking...</span>
                    </div>
                  </div>
                )}

                {/* Service Unavailable / Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <span className="font-bold block">
                          {isServiceUnavailable ? 'Ollama AI Offline (HTTP 503)' : 'Request Notice'}
                        </span>
                        <p className="text-[11px] text-rose-800 leading-normal">
                          {errorMessage}
                        </p>
                      </div>
                    </div>

                    {isServiceUnavailable && (
                      <div className="p-2.5 bg-white rounded-xl border border-rose-200 text-[10px] space-y-1 font-mono">
                        <span className="text-slate-600 font-sans font-semibold block">
                          To enable local open-weight inference:
                        </span>
                        <code className="text-emerald-800 bg-slate-100 px-1.5 py-0.5 rounded block select-all">
                          ollama run qwen2.5:3b-instruct
                        </code>
                        <span className="text-slate-500 font-sans block pt-0.5">
                          CivicTask uses authentic open-weight models with zero fake mocks.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions Strip (shown when conversation is early) */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleSendMessage(question)}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 border border-slate-200 rounded-lg text-[10px] font-medium transition-colors text-left shrink-0 cursor-pointer"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about tasks, points, or rewards..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    aria-label="Send message"
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      inputMessage.trim() && !isLoading
                        ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
                  <span>Qwen2.5-3B-Instruct inference</span>
                  <span>Human admins verify submissions</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
