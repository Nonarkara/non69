'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ShareButton from './ShareButton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  mode: 'think' | 'communicate' | 'reflect';
  placeholder: string;
  title: string;
  subtitle: string;
}

function replaceLastAssistantMessage(messages: Message[], content: string): Message[] {
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') {
    return [...messages, { role: 'assistant', content } as Message];
  }

  const updated = [...messages];
  updated[updated.length - 1] = { role: 'assistant', content };
  return updated;
}

export default function ChatInterface({ mode, placeholder, title, subtitle }: ChatInterfaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionParam = searchParams.get('session');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const requestedSessionId = Number(sessionParam);
    if (!sessionParam) {
      setLoadError('');
      return;
    }

    if (!Number.isInteger(requestedSessionId) || requestedSessionId <= 0) {
      setLoadError('That session link is invalid.');
      return;
    }

    let cancelled = false;

    async function loadConversation() {
      setLoadError('');
      const response = await fetch(`/api/conversations/${requestedSessionId}`, {
        cache: 'no-store',
      }).catch(() => null);

      if (!response) {
        if (!cancelled) {
          setLoadError('Could not load that session.');
        }
        return;
      }

      if (response.status === 401) {
        router.push(`/access?next=/${mode}`);
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.conversation) {
        if (!cancelled) {
          setLoadError(data?.error || 'Could not load that session.');
        }
        return;
      }

      if (!cancelled) {
        setMessages(data.conversation.messages ?? []);
        setConversationId(data.conversation.id ?? requestedSessionId);
      }
    }

    loadConversation();

    return () => {
      cancelled = true;
    };
  }, [mode, router, sessionParam]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const requestMessages = [...messages, userMessage];
    const nextMessages = [...requestMessages, { role: 'assistant', content: '' } as Message];
    setMessages(nextMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, messages: requestMessages, conversationId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'The chat request failed.';
        if (response.status === 401) {
          router.push(`/access?next=/${mode}`);
        }
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      const applyPayload = (data: string) => {
        if (data === '[DONE]') {
          return true;
        }

        const parsed = JSON.parse(data) as {
          text?: string;
          error?: string;
          conversationId?: number;
        };
        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (typeof parsed.conversationId === 'number') {
          setConversationId(parsed.conversationId);
        }

        if (parsed.text) {
          assistantContent += parsed.text;
          setMessages(prev => replaceLastAssistantMessage(prev, assistantContent));
        }

        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) {
              continue;
            }

            if (applyPayload(line.slice(6))) {
              return;
            }
          }
        }

        if (done) {
          break;
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        applyPayload(buffer.trim().slice(6));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setMessages(prev => {
        return replaceLastAssistantMessage(prev, message);
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loadError && (
          <div className="max-w-3xl mx-auto px-4 pt-6">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {loadError}
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-lg px-4">
              <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
              <p className="text-neutral-400 text-lg">{subtitle}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-neutral-900 text-neutral-100 border border-neutral-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {msg.content || (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-block w-2 h-4 bg-neutral-500 animate-pulse" />
                    ) : '')}
                  </div>
                  {msg.role === 'assistant' && msg.content && !isStreaming && (
                    <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-xs text-neutral-500">DrNon private lab · saved to profile</span>
                      <ShareButton
                        payload={{
                          kind: 'lab',
                          mode,
                          summary: msg.content.slice(0, 480),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 bg-black p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
              Private lab. Authenticated. Sessions persist to your profile.
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadError('');
                setMessages([]);
                setConversationId(null);
                if (sessionParam) {
                  router.replace(pathname);
                }
              }}
              className="text-xs px-2 py-1 rounded border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-colors"
            >
              New session
            </button>
          </div>
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-500 text-[15px]"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-white text-black font-medium px-5 py-3 rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isStreaming ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
