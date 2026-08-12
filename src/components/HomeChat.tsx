'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Target, Zap, ArrowUp, Mic } from 'lucide-react';

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
  const { profile, ego, tasks, addTask, addNote } = useSupabase();

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

  const [activeEgoId, setActiveEgoId] = useState<string | null>(null);
  const [hasTriggeredGreeting, setHasTriggeredGreeting] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = () => {
          setIsListening(true);
          const currentVal = inputRef.current?.value || '';
          transcriptRef.current = currentVal;
          recognition._startInput = currentVal;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) recognitionRef.current.stop();
          }, 5000);
        };
        recognition.onend = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setIsListening(false);
          if (transcriptRef.current.trim()) {
            sendMessageRef.current(transcriptRef.current);
            transcriptRef.current = '';
          }
        };
        
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          const startVal = recognition._startInput || '';
          const fullText = startVal + (startVal && !startVal.endsWith(' ') ? ' ' : '') + transcript;
          setInput(fullText);
          transcriptRef.current = fullText;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) recognitionRef.current.stop();
          }, 5000);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in your browser. Please try Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

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
                  setStreamingText(fullText.replace(/\[ACTION:[\s\S]*?\]/g, '').trimStart());
                } catch {}
              }
            }
          }

          const actionRegex = /\[ACTION:(TASK|NOTE)\|([\s\S]*?)\]/g;
          let match;
          while ((match = actionRegex.exec(fullText)) !== null) {
            const type = match[1];
            const params = match[2].split('|');
            if (type === 'TASK') {
              const [title, taskType, time, date] = params;
              addTask(title, (taskType as any) || 'short_term', time, date || new Date().toISOString());
            } else if (type === 'NOTE') {
              const [title, content, color] = params;
              addNote(title, content, color || 'orange');
            }
          }

          setMessages([{ role: 'assistant', content: fullText.replace(/\[ACTION:[\s\S]*?\]/g, '').trim() }]);
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

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);


  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !profile || !ego) return;

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
              setStreamingText(fullText.replace(/\[ACTION:[\s\S]*?\]/g, '').trimStart());
            } catch {}
          }
        }
      }
      
      const actionRegex = /\[ACTION:(TASK|NOTE)\|([\s\S]*?)\]/g;
      let match;
      while ((match = actionRegex.exec(fullText)) !== null) {
        const type = match[1];
        const params = match[2].split('|');
        if (type === 'TASK') {
          const [title, taskType, time, date] = params;
          addTask(title, (taskType as any) || 'short_term', time, date || new Date().toISOString());
        } else if (type === 'NOTE') {
          const [title, content, color] = params;
          addNote(title, content, color || 'orange');
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullText.replace(/\[ACTION:[\s\S]*?\]/g, '').trim() }]);
      setStreamingText('');
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'LEAD AI is temporarily offline.' },
      ]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [messages, isLoading, profile, ego]);

  const handleSuggest = (prefix: string) => {
    setInput(prefix);
    if (inputRef.current) {
      inputRef.current.focus();
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

  if (!profile || !ego) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden select-none font-sans relative group">

      {/* ── HEADER ── */}
      <header className="px-6 py-8 flex items-center justify-between sticky top-0 z-40 bg-gradient-to-b from-black via-black/80 to-transparent">
        <h1 className="text-5xl font-medium leading-[1.1] tracking-tight text-foreground">
          Lead
        </h1>
      </header>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-40">

        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="w-20 h-20 rounded-[32px] bg-card-orange text-black flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Target className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-medium text-foreground">
                {greeting}, {profile.name}.
              </h2>
              <p className="text-black/50 dark:text-white/50 text-sm max-w-[250px] mx-auto leading-relaxed">
                Goal: {ego.goal}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm font-medium bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 p-5 rounded-[24px] hover:bg-black/10 dark:hover:bg-white/10 transition-colors leading-snug"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`px-6 py-4 rounded-[32px] max-w-[85%] text-[15px] font-medium leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-card-yellow text-black rounded-tr-lg'
                    : 'bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 shadow-sm dark:shadow-none text-foreground rounded-tl-lg'
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start">
            <div className="px-6 py-4 rounded-[32px] rounded-tl-lg bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 shadow-sm dark:shadow-none text-black/70 dark:text-white/70 text-[15px] leading-relaxed max-w-[85%]">
              {streamingText || 'Thinking...'}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div className="absolute left-0 right-0 px-6 z-30 flex flex-col items-center transition-all duration-300 bottom-28 max-sm:group-has-[textarea:focus]:bottom-4">
        <div className="flex items-center justify-center gap-3 mb-3 max-w-xl w-full mx-auto">
          <button 
            onClick={() => handleSuggest('Schedule an event: ')} 
            className="px-5 py-2 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all shadow-sm"
          >
            Events
          </button>
          <button 
            onClick={() => handleSuggest('Add a task: ')} 
            className="px-5 py-2 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all shadow-sm"
          >
            Tasks
          </button>
          <button 
            onClick={() => handleSuggest('Take a note: ')} 
            className="px-5 py-2 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md border border-black/10 dark:border-white/10 text-black/80 dark:text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all shadow-sm"
          >
            Notes
          </button>
        </div>
        <form onSubmit={handleSubmit} className="relative max-w-xl w-full mx-auto">
          <div className="flex items-center bg-[#1a1a1a]/90 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-[40px] p-2 shadow-2xl">
            <button 
              type="button"
              onClick={toggleListening}
              className={`w-12 h-12 flex items-center justify-center flex-shrink-0 transition-colors ${
                isListening ? 'text-card-orange animate-pulse' : 'text-black/50 dark:text-white/50 hover:text-foreground'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Lead..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-foreground placeholder-white/30 px-2 py-3.5 outline-none resize-none text-base font-medium overflow-hidden"
              style={{ minHeight: '52px' }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 rounded-full bg-white text-black font-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shadow-sm flex-shrink-0"
            >
              <ArrowUp className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
