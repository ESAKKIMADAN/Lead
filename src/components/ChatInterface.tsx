'use client';

import { motion } from 'framer-motion';
import { type Ego, type Profile } from '@/lib/db';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface({ profile, ego, onClose }: { profile: Profile, ego: Ego, onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localInput, setLocalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = localInput.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLocalInput('');
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
        // Parse AI SDK data stream format: lines starting with "0:" contain text
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

      setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
      setStreamingText('');
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'LEAD is unavailable right now. Check your API key and try again.' }]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-background flex flex-col md:p-6"
    >
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto bg-card border border-border shadow-2xl md:rounded-3xl overflow-hidden">
        
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-heading font-bold uppercase tracking-widest text-primary">LEAD Chat</h2>
            <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Your Personal Accountability Engine</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-2 text-2xl transition-colors">
            ✕
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
              <p className="text-4xl">🎯</p>
              <p className="text-xl font-heading uppercase tracking-widest">Awaiting Input</p>
              <p className="max-w-sm text-muted-foreground">Talk to LEAD about your goals, excuses, or what you conquered today.</p>
            </div>
          )}
          {messages.map((m, index) => (
            <div key={index} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">
                {m.role === 'user' ? profile.name : 'LEAD'}
              </div>
              <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-secondary text-secondary-foreground rounded-tl-sm border border-border'
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Streaming in-progress bubble */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">LEAD</div>
              <div className="px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground rounded-tl-sm border border-border text-xs leading-relaxed">
                {streamingText || <span className="animate-pulse">Thinking...</span>}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 bg-card border-t border-border">
          <form onSubmit={sendMessage} className="flex space-x-3">
            <input
              autoFocus
              className="flex-1 bg-background border border-border text-foreground px-4 py-3 rounded-xl outline-none focus:border-primary transition-colors text-xs"
              value={localInput}
              placeholder="What did you conquer today? Or what's your excuse?"
              onChange={(e) => setLocalInput(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !localInput.trim()}
              className="bg-primary text-primary-foreground px-6 py-4 rounded-xl font-bold uppercase tracking-widest disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Send
            </button>
          </form>
        </div>

      </div>
    </motion.div>
  );
}
