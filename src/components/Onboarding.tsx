'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<{ goal: string; reason: string }[]>([
    { goal: '', reason: '' },
  ]);

  const addGoal = () => {
    setGoals([...goals, { goal: '', reason: '' }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, idx) => idx !== index));
  };

  const updateGoal = (index: number, field: 'goal' | 'reason', value: string) => {
    const updated = [...goals];
    updated[index][field] = value;
    setGoals(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const isValid = goals.every((g) => g.goal.trim() && g.reason.trim());
    if (!isValid) return;

    const profileId = crypto.randomUUID();

    await db.profiles.add({
      id: profileId,
      name: name.trim(),
      streak: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
    });

    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      await db.egos.add({
        id: crypto.randomUUID(),
        userId: profileId,
        goal: g.goal.trim(),
        reason: g.reason.trim(),
        category: 'mindset',
        active: i === 0,
        createdAt: new Date().toISOString(),
      });
    }

    onComplete();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Light Ray Gradient */}
      <div 
        className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] opacity-30 pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(100px)',
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[400px] bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-[2.5rem] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.9)] space-y-6 relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          {/* App Stack Logo */}
          <div className="w-10 h-10 flex items-center justify-center text-neutral-300 mb-2">
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 100 100" 
              fill="currentColor"
            >
              <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
              <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
              <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">Welcome</h1>
          <p className="text-xs text-neutral-500">Please enter your details to get started.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Your Name</label>
            <input 
              type="text" 
              placeholder="Enter your name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950/60 border border-neutral-800 text-sm text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-600"
              autoFocus
            />
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {goals.map((g, idx) => (
              <div key={idx} className="space-y-2 border-t border-neutral-800/40 pt-4 first:border-0 first:pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Goal #{idx + 1}</span>
                  {goals.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeGoal(idx)} 
                      className="text-[9px] text-red-500 hover:text-red-400 uppercase tracking-widest font-black transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. Run a 5K by December" 
                  value={g.goal}
                  onChange={(e) => updateGoal(idx, 'goal', e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-600"
                />
                <input 
                  type="text" 
                  placeholder="Why it matters (Ego Trigger)" 
                  value={g.reason}
                  onChange={(e) => updateGoal(idx, 'reason', e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors placeholder:text-neutral-600"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addGoal}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-neutral-800 hover:border-neutral-700 text-neutral-500 hover:text-neutral-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
          >
            <span>+ Add another goal</span>
          </button>

          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || goals.some(g => !g.goal.trim() || !g.reason.trim())}
            className="w-full bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all disabled:opacity-40"
          >
            Get Started
          </button>
        </div>
      </motion.div>
    </div>
  );
}
