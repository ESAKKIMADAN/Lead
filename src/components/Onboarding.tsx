'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { db, type Ego, type Profile } from '@/lib/db';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [reason, setReason] = useState('');
  const handleNext = () => setStep((s) => s + 1);

  const handleSubmit = async () => {
    const profileId = crypto.randomUUID();
    const egoId = crypto.randomUUID();

    await db.profiles.add({
      id: profileId,
      name,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date().toISOString(),
    });

    await db.egos.add({
      id: egoId,
      userId: profileId,
      goal,
      reason,
      category: 'mindset',
      active: true,
      createdAt: new Date().toISOString(),
    });

    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-heading font-semibold tracking-tight text-foreground">Who is stepping up?</h1>
              <p className="text-muted-foreground mt-2 text-lg">Your goals don't care about your mood. Introduce yourself.</p>
            </div>
            <input 
              type="text" 
              placeholder="Your Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-2xl bg-transparent border-b-2 border-primary/20 focus:border-primary outline-none py-2 transition-colors"
              autoFocus
            />
            <button 
              onClick={handleNext} 
              disabled={!name.trim()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-radius font-semibold uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-heading font-semibold tracking-tight">What is the ambition?</h1>
              <p className="text-muted-foreground mt-2 text-lg">Define the target. Be specific.</p>
            </div>
            <textarea 
              placeholder="e.g. Run a 5K by December" 
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full text-2xl bg-transparent border-b-2 border-primary/20 focus:border-primary outline-none py-2 resize-none h-32 transition-colors"
              autoFocus
            />
            <button 
              onClick={handleNext} 
              disabled={!goal.trim()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-radius font-semibold uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-heading font-semibold tracking-tight">Why does this matter?</h1>
              <p className="text-muted-foreground mt-2 text-lg">This is the soul of LEAD. We will remind you of this when you want to quit.</p>
            </div>
            <textarea 
              placeholder="e.g. To prove to myself I can finish things I start" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-2xl bg-transparent border-b-2 border-primary/20 focus:border-primary outline-none py-2 resize-none h-32 transition-colors"
              autoFocus
            />
            <button 
              onClick={handleSubmit} 
              disabled={!reason.trim()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-radius font-semibold uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Lock It In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
