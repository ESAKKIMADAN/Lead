'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

// Card configs — gradient + blob colors matching the reference screenshot
const DAY_CARDS = [
  {
    label: 'Today',
    offset: 0,
    gradient: 'from-[#0fbcf9] via-[#07d7f6] to-[#48dbfb]',
    blob1: 'bg-[#0abad0]/40',
    blob2: 'bg-[#ffffff]/20',
    ring: '#ffffff',
    accent: '#05c0da',
  },
  {
    label: 'Tomorrow',
    offset: 1,
    gradient: 'from-[#f9a826] via-[#fd7e3b] to-[#e84393]',
    blob1: 'bg-[#f56fa8]/40',
    blob2: 'bg-[#ffd06b]/30',
    ring: '#ffffff',
    accent: '#ffd06b',
  },
];

function getTasksForDate(tasks: any[], date: Date, type = 'short_term') {
  const dateStr = date.toDateString();
  return tasks.filter(t => t.type === type).filter(task => {
    const d = task.target_date
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return d === dateStr;
  });
}

export default function TodoView() {
  const { profile, ego, tasks, toggleTask, deleteTask, addTask } = useSupabase();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showInput, setShowInput] = useState(false);

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  const dates = [today, tomorrow];
  const activeDate = dates[activeCardIdx];
  const activeCard = DAY_CARDS[activeCardIdx];

  const tasksForActive = getTasksForDate(tasks, activeDate);
  const completed = tasksForActive.filter(t => t.completed).length;
  const total = tasksForActive.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Circular SVG progress values
  const R = 20;
  const circumference = 2 * Math.PI * R;
  const dash = (pct / 100) * circumference;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTaskTitle.trim();
    if (!t) return;
    await addTask(t, 'short_term', undefined, activeDate.toISOString());
    setNewTaskTitle('');
    setShowInput(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0d0d0d] text-foreground pb-32">
      <div className="max-w-md mx-auto px-5 pt-9 pb-4">

        {/* ── TOP HEADER ── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Focus Planner</p>
            <h1 className="text-2xl font-black text-foreground mt-0.5">Your Tasks</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── DAY SELECTOR PILLS ── */}
        <div className="flex gap-2 mb-5">
          {DAY_CARDS.map((card, i) => {
            const d = dates[i];
            const t = getTasksForDate(tasks, d);
            const isActive = i === activeCardIdx;
            return (
              <button
                key={card.label}
                onClick={() => { setActiveCardIdx(i); setShowInput(false); }}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-white dark:bg-neutral-900 border border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {card.label}
                {t.length > 0 && (
                  <span className={`ml-1.5 text-[10px] font-black ${isActive ? 'text-background/60' : 'text-muted-foreground/60'}`}>
                    {t.filter(x => x.completed).length}/{t.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── GRADIENT HERO CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCardIdx}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`relative rounded-[28px] bg-gradient-to-br ${activeCard.gradient} p-6 mb-5 overflow-hidden shadow-2xl`}
            style={{ minHeight: 200 }}
          >
            {/* Decorative blobs */}
            <div className={`absolute -bottom-10 -right-10 w-44 h-44 ${activeCard.blob1} rounded-full blur-xl pointer-events-none`} />
            <div className={`absolute top-4 -left-8 w-32 h-32 ${activeCard.blob2} rounded-full blur-2xl pointer-events-none`} />
            <div className="absolute bottom-12 right-16 w-16 h-16 bg-white/10 rounded-full blur-sm pointer-events-none" />

            {/* Card content */}
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.15em]">
                    {activeCard.label === 'Today'
                      ? today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                      : tomorrow.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <h2 className="text-white font-black text-2xl leading-tight mt-1">
                    Daily<br />Tasks
                  </h2>
                </div>

                {/* Circular progress */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                    <motion.circle
                      cx="24" cy="24" r={R}
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: circumference - dash }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px]">
                    {pct}%
                  </div>
                </div>
              </div>

              {/* Task counter */}
              <div className="mt-auto pt-8 flex items-end justify-between">
                <div>
                  <p className="text-white font-black text-3xl leading-none">
                    {completed}
                    <span className="text-white/50 font-bold text-xl">/{total}</span>
                  </p>
                  <p className="text-white/70 text-[11px] font-semibold mt-0.5 uppercase tracking-wider">tasks complete</p>
                </div>

                {/* Add button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowInput(v => !v)}
                  className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-lg transition-all"
                >
                  <svg
                    width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={showInput ? '#ef4444' : '#333'}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: 'all 0.2s' }}
                  >
                    {showInput
                      ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                      : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                    }
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── ADD TASK INPUT ── */}
        <AnimatePresence>
          {showInput && (
            <motion.form
              onSubmit={handleAddTask}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 bg-white dark:bg-neutral-900 border border-border rounded-2xl p-2 shadow-sm">
                <input
                  autoFocus
                  type="text"
                  placeholder={`Add task for ${activeCard.label.toLowerCase()}...`}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/50 px-3 py-2 outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="bg-foreground text-background rounded-xl px-5 py-2 text-xs font-black uppercase tracking-widest disabled:opacity-30 transition-all active:scale-95"
                >
                  Add
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── TASK LIST ── */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-border overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-black text-foreground text-sm">
              {activeCard.label === 'Today' ? "Today's Focus" : "Tomorrow's Plan"}
            </h3>
            {total > 0 && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-br ${activeCard.gradient} text-white shadow-sm`}>
                {completed}/{total}
              </span>
            )}
          </div>

          {/* Task items */}
          <div className="divide-y divide-border/40 max-h-[380px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {tasksForActive.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-12 px-6 text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeCard.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <p className="text-foreground font-bold text-sm">No tasks yet</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                    Tap the + button on the card above to add a task
                  </p>
                </motion.div>
              ) : (
                tasksForActive.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="flex items-center gap-3.5 px-5 py-4 group hover:bg-muted/20 dark:hover:bg-white/5 transition-all"
                  >
                    {/* Checkbox */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleTask(task)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.completed
                          ? `bg-gradient-to-br ${activeCard.gradient} border-transparent shadow-md`
                          : 'border-border group-hover:border-foreground/40'
                      }`}
                    >
                      {task.completed && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </motion.button>

                    {/* Task title */}
                    <span className={`flex-1 text-sm font-semibold transition-all ${
                      task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all active:scale-90 flex-shrink-0"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {total > 0 && (
            <div className={`px-5 py-3.5 bg-gradient-to-r ${activeCard.gradient} flex items-center justify-between`}>
              <span className="text-white/80 text-[11px] font-bold">
                {completed} of {total} complete
              </span>
              <span className="text-white font-black text-[11px] uppercase tracking-wider">
                {pct === 100 ? '🎯 All done!' : `${100 - pct}% left`}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
