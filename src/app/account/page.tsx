'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const ego = useLiveQuery(() => db.egos.toCollection().first());
  const tasks = useLiveQuery(() => db.tasks.where('type').equals('short_term').toArray()) || [];
  const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  if (!profile || !ego) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground uppercase tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalCompleted = allTasks.filter((t) => t.completed).length;

  const categoryEmoji: Record<string, string> = {
    health: '💪',
    career: '🚀',
    relationships: '❤️',
    finance: '💰',
    mindset: '🧠',
  };

  const handleSaveEgo = async () => {
    if (!ego) return;
    setSaving(true);
    await db.egos.update(ego.id, {
      goal: newGoal || ego.goal,
      reason: newReason || ego.reason,
    });
    setSaving(false);
    setEditingGoal(false);
  };

  const handleReset = async () => {
    await db.profiles.clear();
    await db.egos.clear();
    await db.tasks.clear();
    await db.notificationLog.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/')}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg"
          id="account-back-btn"
        >
          ←
        </button>
        <img src="/logo.svg" alt="Lead by SolveCrew" className="w-8 h-8 object-contain" />
        <h1 className="font-heading font-bold text-xl uppercase tracking-widest">Account</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl uppercase">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-heading font-bold">{profile.name}</h2>
              <p className="text-muted-foreground text-sm uppercase tracking-wider mt-1">
                {categoryEmoji[ego.category]} {ego.category} — Lead by SolveCrew
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 md:gap-4"
        >
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 text-center flex flex-col justify-center items-center overflow-hidden">
            <p className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary truncate w-full">{profile.streak || 0}</p>
            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider md:tracking-widest mt-2 whitespace-nowrap">Day Streak</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 text-center flex flex-col justify-center items-center overflow-hidden">
            <p className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary truncate w-full">{progressPercent}%</p>
            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider md:tracking-widest mt-2 whitespace-nowrap">Today Done</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 text-center flex flex-col justify-center items-center overflow-hidden">
            <p className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary truncate w-full">{totalCompleted}</p>
            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider md:tracking-widest mt-2 whitespace-nowrap">Total Tasks ✓</p>
          </div>
        </motion.div>

        {/* Today's Progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Today's Progress</p>
            <p className="text-sm font-bold text-foreground">{completedTasks} / {totalTasks} tasks</p>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              className="bg-primary h-full rounded-full"
            />
          </div>
        </motion.div>

        {/* Ego / Goal Settings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-8 space-y-6"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Ego Setup</h3>
            <button
              id="account-edit-ego-btn"
              onClick={() => {
                setEditingGoal(!editingGoal);
                setNewGoal(ego.goal);
                setNewReason(ego.reason);
              }}
              className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
            >
              {editingGoal ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {!editingGoal ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Goal</p>
                <p className="text-lg text-foreground font-light">{ego.goal}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Why it matters</p>
                <p className="text-lg text-foreground font-light italic">"{ego.reason}"</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                <p className="text-base text-foreground">{categoryEmoji[ego.category]} {ego.category}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Goal</label>
                <textarea
                  id="account-goal-input"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Why it matters (ego trigger)</label>
                <textarea
                  id="account-reason-input"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors"
                />
              </div>
              <button
                id="account-save-btn"
                onClick={handleSaveEgo}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-destructive/20 rounded-2xl p-8 space-y-4"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-destructive">Danger Zone</h3>
          <p className="text-muted-foreground text-sm">
            Reset all your data — profile, goals, tasks, and history. This cannot be undone.
          </p>
          {!resetConfirm ? (
            <button
              id="account-reset-btn"
              onClick={() => setResetConfirm(true)}
              className="px-6 py-3 border border-destructive/40 text-destructive rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-destructive/10 transition-colors"
            >
              Reset Account
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                id="account-reset-confirm-btn"
                onClick={handleReset}
                className="flex-1 bg-destructive text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Yes, reset everything
              </button>
              <button
                onClick={() => setResetConfirm(false)}
    