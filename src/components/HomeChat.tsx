'use client';

import { useSupabase } from '@/lib/SupabaseContext';
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
  const { profile, ego, tasks } = useSupabase();

  // Calculate today's tasks progress
  const todayStr = new Date().toDateString();
  const todayTasks = tasks ? tasks.filter(t => t.type === 'short_term').filter(task => {
    const taskDate = task.target_date 
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return taskDate === todayStr;
  }) : [];

  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">

      {/* ── HEADER ── */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor" className="text-foreground">
            <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
            <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
            <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
          </svg>
          <span className="font-heading font-bold text-sm tracking-[0.1em] uppercase text-foreground/90">LEAD</span>
        </div>
        
        <div className="relative flex items-center justify-center w-12 h-12 bg-muted border border-border/60 rounded-full shadow-inner">
          <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
            {/* Circle Track */}
            <circle
              cx="18"
              cy="18"
              r="15"
              className="stroke-background"
              strokeWidth="2.2"
              fill="transparent"
            />
            {/* Circle Progress */}
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              className="stroke-primary"
              strokeWidth="2.2"
              fill="transparent"
              strokeDasharray="94.2"
              animate={{ strokeDashoffset: 94.2 - (percentage / 100) * 94.2 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground tracking-tighter">
            {percentage}%
          </div>
        </div>
      </header>

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
              <h2 className="text-xl font-bold text-foreground/90 mt-4 animate-fade-in">
                {greeting}, {profile.name}.
              </h2>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto leading-relaxed">
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
                  className="text-left text-xs font-medium bg-card border border-border text-foreground/80 px-4 py-3 rounded-xl hover:bg-muted hover:border-border hover:text-foreground transition-all leading-snug active:scale-[0.98] shadow-sm"
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
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-muted-foreground/85 px-1">
                {m.role === 'user' ? profile.name : 'LEAD'}
              </p>
              <div
                className={`px-4 py-3 rounded-2xl max-w-[82%] text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-foreground/90 rounded-tl-sm'
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
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-muted-foreground/85 px-1">
              LEAD
            </p>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground/90 text-xs leading-relaxed max-w-[82%] shadow-sm">
              {streamingText || (
                <span className="flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/80 animate-bounce" style={{ animationDelay: '300ms' }} />
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
          
          <div className="relative flex items-end gap-0 bg-muted border border-border rounded-2xl overflow-hidden focus-within:border-border/90 transition-all duration-300 shadow-inner">
            <textarea
              ref={inputRef}
              id="home-chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to LEAD..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/50 px-5 py-4 outline-none resize-none text-sm leading-relaxed overflow-hidden"
              style={{ minHeight: '52px' }}
            />
            <div className="flex-shrink-0 p-2">
              <button
                id="home-chat-send-btn"
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
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
