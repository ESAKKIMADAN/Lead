'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { createInitialData } = useSupabase();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<{ goal: string; reason: string }[]>([
    { goal: '', reason: '' },
  ]);

  const [avoidanceResponse, setAvoidanceResponse] = useState('');
  const [actionTrigger, setActionTrigger] = useState('');
  const [postponeReaction, setPostponeReaction] = useState('');

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

  const handleNext = () => {
    if (!name.trim()) return;
    const isValid = goals.every((g) => g.goal.trim() && g.reason.trim());
    if (!isValid) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!avoidanceResponse || !actionTrigger || !postponeReaction) return;
    const psychology = {
      avoidance_response: avoidanceResponse,
      action_trigger: actionTrigger,
      postpone_reaction: postponeReaction,
    };
    await createInitialData(name, goals, psychology);
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
          {/* App Logo */}
          <div className="w-12 h-12 flex items-center justify-center mb-2">
            <img src="/logo-white.png" alt="LEAD" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            {step === 1 ? 'Welcome' : 'Your Psychology'}
          </h1>
          <p className="text-xs text-neutral-500">
            {step === 1 ? 'Please enter your details to get started.' : 'How should LEAD adapt to you?'}
          </p>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
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
              onClick={handleNext} 
              disabled={!name.trim() || goals.some(g => !g.goal.trim() || !g.reason.trim())}
              className="w-full bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all disabled:opacity-40"
            >
              Next Step
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">When avoiding work, LEAD should...</label>
              <select 
                value={avoidanceResponse}
                onChange={e => setAvoidanceResponse(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors appearance-none"
              >
                <option value="" disabled>Select style...</option>
                <option value="supportive">Encourage me gently</option>
                <option value="direct">Be direct with me</option>
                <option value="tough_love">Push me hard (No excuses)</option>
                <option value="challenge">Challenge my ego</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">What triggers your action?</label>
              <select 
                value={actionTrigger}
                onChange={e => setActionTrigger(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors appearance-none"
              >
                <option value="" disabled>Select trigger...</option>
                <option value="motivation">Feeling motivated & inspired</option>
                <option value="pressure">Someone forcing me</option>
                <option value="deadline">A strict deadline</option>
                <option value="fear_of_losing">Fear of losing opportunity</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">When postponing, LEAD should...</label>
              <select 
                value={postponeReaction}
                onChange={e => setPostponeReaction(e.target.value)}
                className="w-full bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors appearance-none"
              >
                <option value="" disabled>Select reaction...</option>
                <option value="remind_reason">Remind me why I started</option>
                <option value="call_out_directly">Call me out on my laziness</option>
                <option value="show_consequences">Show me what I'm losing</option>
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                onClick={() => setStep(1)} 
                className="w-1/3 bg-neutral-800 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-700 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!avoidanceResponse || !actionTrigger || !postponeReaction}
                className="w-2/3 bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all disabled:opacity-40"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
