'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

// Gradient palettes for the hero card — cycles based on day of week
const HERO_GRADIENTS = [
  'from-violet-600 via-purple-500 to-indigo-600',
  'from-rose-500 via-pink-500 to-fuchsia-600',
  'from-orange-400 via-amber-400 to-yellow-400',
  'from-cyan-500 via-teal-500 to-emerald-600',
  'from-blue-600 via-indigo-500 to-violet-600',
  'from-green-500 via-emerald-500 to-teal-600',
  'from-red-500 via-rose-500 to-pink-600',
];

export default function TodoView() {
  const { profile, ego, tasks, toggleTask, deleteTask, addTask } = useSupabase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest animate-pulse">Loading Tasks...</p>
        </div>
      </div>
    );
  }

  // Filter tasks for selected date
  const selectedDateStr = selectedDate.toDateString();
  const allShortTermTasks = tasks.filter(t => t.type === 'short_term');
  const tasksForSelectedDate = allShortTermTasks.filter(task => {
    const taskDate = task.target_date
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return taskDate === selectedDateStr;
  });

  const completedCount = tasksForSelectedDate.filter(t => t.completed).length;
  const total = tasksForSelectedDate.length;
  const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Pick gradient based on day of week
  const gradientClass = HERO_GRADIENTS[selectedDate.getDay()];

  // Build a 5-day window centered on today for quick pill navigation
  const today = new Date();
  const pillDays: Date[] = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    pillDays.push(d);
  }

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    await addTask(title, 'short_term', undefined, selectedDate.toISOString());
    setNewTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-md mx-auto px-4 pt-8 pb-4 space-y-5">

        {/* ── HERO GRADIENT CARD ── */}
        <motion.div
          key={selectedDate.toDateString()}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`relative rounded-3xl p-7 bg-gradient-to-br ${gradientClass} overflow-hidden shadow-xl`}
        >
          {/* Background blobs */}
          <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Date nav */}
          <div className="flex items-center justify-between relative z-10">
            <button
              onClick={handlePrevDay}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.18em]">
                {isToday ? 'Today' : selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
              </p>
              <p className="text-white font-extrabold text-lg leading-tight mt-0.5">
                {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
              </p>
            </div>

            <button
              onClick={handleNextDay}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-end justify-between mt-7 relative z-10">
            <div>
              <p className="text-white font-black text-4xl leading-none">
                {completedCount}<span className="text-white/50 text-2xl font-bold">/{total}</span>
              </p>
              <p className="text-white/70 text-xs font-semibold mt-1 uppercase tracking-wider">Tasks complete</p>
            </div>

            {/* Circular progress */}
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <motion.circle
                  cx="28" cy="28" r="22"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="138.2"
                  initial={{ strokeDashoffset: 138.2 }}
                  animate={{ strokeDashoffset: 138.2 - (progressPercent / 100) * 138.2 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm">
                {progressPercent}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 relative z-10">
            <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── DATE PILL STRIP ── */}
        <div className="flex gap-2 justify-between px-1">
          {pillDays.map(d => {
            const isActive = d.toDateString() === selectedDate.toDateString();
            const isT = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={d.toDateString()}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl flex-1 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-card border border-border text-foreground/60 hover:bg-muted'
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className={`text-sm font-black ${isActive ? '' : isT ? 'text-foreground' : ''}`}>
                  {d.getDate()}
                </span>
                {isT && !isActive && (
                  <span className="w-1 h-1 bg-foreground/40 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── TASK LIST CARD ── */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-border/60">
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Focus List</p>
              <h2 className="text-base font-black text-foreground mt-0.5">
                {isToday ? "Today's Tasks" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
            </div>
            <button
              onClick={() => setIsAdding(v => !v)}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                isAdding ? 'bg-foreground text-background' : 'bg-muted border border-border text-foreground'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {isAdding
                  ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                  : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                }
              </svg>
            </button>
          </div>

          {/* Add Task Input */}
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddTask} className="px-5 py-3 flex gap-2 bg-muted/30 border-b border-border/60">
                  <input
                    autoFocus
                    type="text"
                    placeholder={`New task for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}...`}
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-muted border border-border/60 text-foreground placeholder-muted-foreground/60 rounded-xl px-4 py-2.5 outline-none focus:border-foreground/40 transition-colors text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="bg-foreground text-background font-bold text-xs uppercase tracking-widest rounded-xl px-4 py-2.5 disabled:opacity-40 transition-all active:scale-95 shadow-sm"
                  >
                    Add
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task Items */}
          <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {tasksForSelectedDate.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-14 text-center px-6"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-4 shadow-md`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <p className="text-foreground font-bold text-sm">No tasks yet</p>
                  <p className="text-muted-foreground text-xs mt-1 max-w-[200px] leading-relaxed">
                    Tap + to add a task for {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </motion.div>
              ) : (
                tasksForSelectedDate.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 px-5 py-3.5 group hover:bg-muted/20 transition-all"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                        task.completed
                          ? `bg-gradient-to-br ${gradientClass} border-transparent shadow-sm`
                          : 'border-border group-hover:border-foreground/40'
                      }`}
                    >
                      {task.completed && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Title */}
                    <span className={`flex-1 text-sm font-medium transition-all ${
                      task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                      title="Remove task"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Footer stats */}
          {total > 0 && (
            <div className="px-5 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                {completedCount} of {total} complete
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                progressPercent === 100
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground/10 text-foreground'
              }`}>
                {progressPercent === 100 ? '🎯 All done!' : `${progressPercent}% done`}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
