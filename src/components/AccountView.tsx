'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function AccountView() {
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const egos = useLiveQuery(() => db.egos.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.where('type').equals('short_term').toArray()) || [];
  const allTasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const [editingEgoId, setEditingEgoId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [addingNew, setAddingNew] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newReason, setNewReason] = useState('');
  const [addingSaving, setAddingSaving] = useState(false);

  const [resetConfirm, setResetConfirm] = useState(false);

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground uppercase tracking-widest text-sm">Loading Profile...</div>
      </div>
    );
  }

  const activeEgo = egos.find((e) => e.active);
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalCompleted = allTasks.filter((t) => t.completed).length;

  const handleSwitchActive = async (egoId: string) => {
    if (egoId === activeEgo?.id) return;
    await db.egos.toCollection().modify({ active: false });
    await db.egos.update(egoId, { active: true });
  };

  const handleSaveEdit = async () => {
    if (!editingEgoId) return;
    setSaving(true);
    await db.egos.update(editingEgoId, {
      goal: editGoal.trim(),
      reason: editReason.trim(),
    });
    setSaving(false);
    setEditingEgoId(null);
  };

  const handleDelete = async (egoId: string) => {
    if (egos.length <= 1) return;
    const wasActive = egos.find((e) => e.id === egoId)?.active;
    await db.egos.delete(egoId);
    if (wasActive) {
      const remaining = await db.egos.toCollection().first();
      if (remaining) await db.egos.update(remaining.id, { active: true });
    }
  };

  const handleAddEgo = async () => {
    if (!newGoal.trim() || !newReason.trim()) return;
    setAddingSaving(true);
    await db.egos.toCollection().modify({ active: false });
    await db.egos.add({
      id: crypto.randomUUID(),
      userId: profile.id,
      goal: newGoal.trim(),
      reason: newReason.trim(),
      category: 'mindset',
      active: true,
      createdAt: new Date().toISOString(),
    });
    setAddingSaving(false);
    setNewGoal('');
    setNewReason('');
    setAddingNew(false);
  };

  const handleReset = async () => {
    await db.profiles.clear();
    await db.egos.clear();
    await db.tasks.clear();
    await db.notificationLog.clear();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

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
              <p className="text-muted-foreground text-sm uppercase tracking-wider mt-1">Lead by SolveCrew</p>
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

        {/* ── Egos Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Egos</h3>
            <button
              id="account-add-ego-btn"
              onClick={() => { setAddingNew(true); setEditingEgoId(null); }}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Ego
            </button>
          </div>

          <AnimatePresence>
            {egos.map((ego) => (
              <motion.div
                key={ego.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className={`relative bg-card border rounded-2xl p-6 cursor-pointer transition-all duration-200 ${
                  ego.active
                    ? 'border-primary/60 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_24px_rgba(255,255,255,0.04)]'
                    : 'border-border hover:border-white/20'
                }`}
                onClick={() => { if (editingEgoId !== ego.id) handleSwitchActive(ego.id); }}
              >
                {/* Active badge */}
                {ego.active && (
                  <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}

                {editingEgoId === ego.id ? (
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Goal</label>
                      <textarea
                        value={editGoal}
                        onChange={(e) => setEditGoal(e.target.value)}
                        rows={2}
                        className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Why it matters</label>
                      <textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        rows={2}
                        className="w-full bg-background border border-border text-foreground rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingEgoId(null)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pr-16">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Goal</p>
                      <p className="text-base text-foreground font-medium leading-snug">{ego.goal}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Why it matters</p>
                      <p className="text-sm text-muted-foreground font-light italic">"{ego.reason}"</p>
                    </div>
                    <div className="flex items-center gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingEgoId(ego.id); setEditGoal(ego.goal); setEditReason(ego.reason); }}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Edit
                      </button>
                      {egos.length > 1 && (
                        <button
                          onClick={() => handleDelete(ego.id)}
                          className="text-[10px] font-bold uppercase tracking-widest text-destructive/60 hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      {!ego.active && (
                        <button
                          onClick={() => handleSwitchActive(ego.id)}
                          className="ml-auto text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
                        >
                          Set Active →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Add New Ego Form ── */}
          <AnimatePresence>
            {addingNew && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-primary">New Ego</p>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Goal</label>
                  <textarea
                    id="new-ego-goal-input"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    rows={2}
                    placeholder="e.g. Run a 5K by December"
                    className="w-full bg-background border border-border text-foreground placeholder-muted-foreground/50 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors text-xs"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Why it matters</label>
                  <textarea
                    id="new-ego-reason-input"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. To prove to myself I can finish what I start"
                    className="w-full bg-background border border-border text-foreground placeholder-muted-foreground/50 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none transition-colors text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    id="new-ego-save-btn"
                    onClick={handleAddEgo}
                    disabled={addingSaving || !newGoal.trim() || !newReason.trim()}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {addingSaving ? 'Adding...' : 'Lock It In'}
                  </button>
                  <button
                    onClick={() => { setAddingNew(false); setNewGoal(''); setNewReason(''); }}
                    className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-80 transition-opacity"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <button id="account-reset-confirm-btn" onClick={handleReset} className="flex-1 bg-destructive text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
                Yes, reset everything
              </button>
              <button onClick={() => setResetConfirm(false)} className="flex-1 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:opacity-80 transition-opacity">
                Cancel
              </button>
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest pb-8">
          Lead by SolveCrew
        </p>

      </div>
    </div>
  );
}
