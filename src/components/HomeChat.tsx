'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'What should I focus on today?',
  'Hold me accountable right now.',
  'I feel like giving up.',
  'What\'s my next step?',
];

export default function HomeChat() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const ego = useLiveQuery(() => db.egos.filter((e) => e.active === true).first());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Auto-resize textarea
  const [activeEgoId, setActiveEgoId] = useState<string | null>(null);
  const [hasTriggeredGreeting, setHasTriggeredGreeting] = useState(false);

  // Reset chat when the active ego changes
  useEffect(() => {
    if (ego && ego.id !== activeEgoId) {
      setActiveEgoId(ego.id);
      setMessages([]);
      setStreamingText('');
      setHasTriggeredGreeting(false);
    }
  }, [ego?.id]);

  useEffect(() => {
    if (profile && ego && messages.length === 0 && !hasTriggeredGreeting && !isLoading) {
      setHasTriggeredGreeting(true);
      const triggerGreeting = async () => {
        setIsLoading(true);
        setStreamingText('');
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [],
              profileData: {
                name: profile.name,
                goal: ego.goal,
                reason: ego.reason,
                category: ego.category,
              },
            }),
          });
          if (!res.ok || !res.body) throw new Error('API error');
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (line.startsWith('0:')) {
                try {
                  const parsed = JSON.parse(line.slice(2));
                  fullText += parsed;
                  setStreamingText(fullText);
                } catch {}
              }
            }
          }
          setMessages([{ role: 'assistant', content: fullText }]);
          setStreamingText('');
        } catch {
          setMessages([
            { role: 'assistant', content: `Alright ${profile.name}, let's get to it. You're here because you want to "${ego.goal}" because you remember "${ego.reason}". No excuses today. What are you doing right now?` }
          ]);
          setStreamingText('');
        } finally {
          setIsLoading(false);
        }
      };
      triggerGreeting();
    }
  }, [profile, ego, messages.length, hasTriggeredGreeting, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  if (!profile || !ego) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          profileData: {
            name: profile.name,
            goal: ego.goal,
            reason: ego.reason,
            category: ego.category,
          },
        }),
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('0:')) {
            try {
              const parsed = JSON.parse(line.slice(2));
              fullText += parsed;
              setStreamingText(fullText);
            } catch {}
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullText }]);
      setStreamingText('');
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'LEAD is unavailable right now. Check your API key.' },
      ]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-neutral-100 overflow-hidden">

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <p className="text-5xl">🎯</p>
              <h2 className="text-xl font-bold text-neutral-200 mt-4 animate-fade-in">
                {greeting}, {profile.name}.
              </h2>
              <p className="text-neutral-500 text-xs max-w-xs mx-auto leading-relaxed">
                {ego.goal}
              </p>
            </motion.div>

            {/* Quick prompts */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-2 gap-3 w-full max-w-sm"
            >
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-xs font-medium bg-neutral-900/40 border border-neutral-900 text-neutral-300 px-4 py-3 rounded-xl hover:bg-neutral-800 hover:border-neutral-700/80 hover:text-neutral-100 transition-all leading-snug active:scale-[0.98]"
                >
                  {prompt}
                </button>
              ))}
            </motion.div>
          </div>
        )}

        {/* Message bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-neutral-500 px-1">
                {m.role === 'user' ? profile.name : 'LEAD'}
              </p>
              <div
                className={`px-4 py-3 rounded-2xl max-w-[82%] text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-white text-black rounded-tr-sm'
                    : 'bg-neutral-900/40 border border-neutral-900 text-neutral-200 rounded-tl-sm'
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming bubble */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start"
          >
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-neutral-500 px-1">
              LEAD
            </p>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-neutral-900/40 border border-neutral-900 text-neutral-200 text-xs leading-relaxed max-w-[82%]">
              {streamingText || (
                <span className="flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div className="flex-shrink-0 px-5 pt-3 pb-32">
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          
          <div className="relative flex items-end gap-0 bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden focus-within:border-neutral-800 transition-all duration-300">
            <textarea
              ref={inputRef}
              id="home-chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to LEAD..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-700 px-5 py-4 outline-none resize-none text-sm leading-relaxed overflow-hidden"
              style={{ minHeight: '52px' }}
            />
            <div className="flex-shrink-0 p-2">
              <button
                id="home-chat-send-btn"
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-30 hover:bg-neutral-200 active:scale-95 transition-all duration-150"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

    </div>
  );
}
