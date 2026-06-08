'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';

export default function AddTaskModal({ 
  profileId, 
  onClose 
}: { 
  profileId: string, 
  onClose: () => void 
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'short_term' | 'long_term'>('short_term');
  const [scheduledTime, setScheduledTime] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await db.tasks.add({
      id: crypto.randomUUID(),
      userId: profileId,
      title: title.trim(),
      type,
      scheduledTime: type === 'short_term' ? scheduledTime : undefined,
      targetDate: type === 'long_term' ? targetDate : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border p-8 rounded-3xl shadow-2xl max-w-md w-full"
      >
        <h2 className="text-2xl font-heading font-bold uppercase mb-6 text-primary">New Ambition / System</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Title
            </label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Walk or Lose 15kg"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setType('short_term')}
                className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors border ${
                  type === 'short_term' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-primary/50'
                }`}
              >
                Daily System
              </button>
              <button
                type="button"
                onClick={() => setType('long_term')}
                className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors border ${
                  type === 'long_term' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:border-primary/50'
                }`}
              >
                Long-Term Goal
              </button>
            </div>
          </div>

          {type === 'short_term' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Daily Scheduled Time
              </label>
              <input 
                type="time" 
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary"
              />
            </motion.div>
          )}

          {type === 'long_term' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Target Completion Date
              </label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary"
              />
            </motion.div>
          )}

          <div className="flex space-x-4 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-background text-foreground border border-border py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
