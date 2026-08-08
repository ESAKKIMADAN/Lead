'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';

const DAY_CARDS = [
  {
    label: 'Today',
    offset: 0,
    gradient: 'from-[#0fbcf9] via-[#07d7f6] to-[#48dbfb]',
    blob1: 'bg-cyan-300/35',
    blob2: 'bg-white/15',
    shadow: 'shadow-cyan-400/25',
  },
  {
    label: 'Tomorrow',
    offset: 1,
    gradient: 'from-[#f9a826] via-[#fd7e3b] to-[#e84393]',
    blob1: 'bg-pink-400/30',
    blob2: 'bg-yellow-200/20',
    shadow: 'shadow-orange-400/25',
  },
];

function getTasksForDate(tasks: any[], date: Date) {
  const dateStr = date.toDateString();
  return tasks.filter(t => t.type === 'short_term').filter(task => {
    const d = task.target_date
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return d === dateStr;
  });
}

export default function TodoView() {
  const { profile, ego, tasks, toggleTask, deleteTask, addTask } = useSupabase();

  const base = new Date();
  const dates = [0, 1].map(offset => {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    return d;
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-7 h-7 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const activeDate = dates[activeIdx];
  const card = DAY_CARDS[activeIdx];
  const dayTasks = getTasksForDate(tasks, activeDate);
  const completed = dayTasks.filter(t => t.completed).length;
  const total = dayTasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const R = 20;
  const circ = 2 * Math.PI * R;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTask.trim();
    if (!t) return;
    setAddingTask(true);
    await addTask(t, 'short_term', undefined, activeDate.toISOString());
    setNewTask('');
    setShowInput(false);
    setAddingTask(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0a0a0a] pb-32">
      <div className="max-w-md mx-auto px-4 pt-9">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">Focus Planner</p>
            <h1 className="text-[26px] font-black text-foreground leading-tight mt-0.5 tracking-tight">My Tasks</h1>
          </div>
          <div className="w-11 h-11 rounded-[16px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-violet-500/30">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── DAY PILLS ── */}
        <div className="flex gap-2 mb-5">
          {DAY_CARDS.map((c, i) => {
            const t = getTasksForDate(tasks, dates[i]);
            const comp = t.filter(x => x.completed).length;
            const isActive = i === activeIdx;
            return (
              <motion.button
                key={c.label}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setActiveIdx(i); setShowInput(false); }}
                className={`flex-1 py-3 px-4 rounded-[16px] text-xs font-black transition-all ${
                  isActive
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-white dark:bg-neutral-900/80 border border-border/60 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span>{c.label}</span>
                {t.length > 0 && (
                  <span className={`ml-1.5 ${isActive ? 'text-background/50' : 'text-muted-foreground/50'}`}>
                    {comp}/{t.length}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── HERO GRADIENT CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`relative rounded-[24px] bg-gradient-to-br ${card.gradient} p-6 mb-5 overflow-hidden shadow-2xl ${card.shadow}`}
            style={{ minHeight: 195 }}
          >
            <div className={`absolute -bottom-10 -right-10 w-44 h-44 ${card.blob1} rounded-full blur-2xl pointer-events-none`} />
            <div className={`absolute -top-6 -left-8 w-32 h-32 ${card.blob2} rounded-full blur-2xl pointer-events-none`} />
            <div className="absolute bottom-14 right-16 w-16 h-16 bg-white/10 rounded-full blur-sm pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/65 text-[10px] font-black uppercase tracking-[0.18em]">
                    {activeDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <h2 className="text-white font-black text-[22px] leading-tight mt-1 tracking-tight">
                    Daily<br />Tasks
                  </h2>
                </div>

                {/* Circular progress */}
                <div className="relative w-[52px] h-[52px]">
                  <svg className="w-[52px] h-[52px] -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3.5" />
                    <motion.circle
                      cx="24" cy="24" r={R}
                      fill="none" stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[12px]">
                    {pct}%
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-7 flex items-end justify-between">
                <div>
                  <p className="text-white font-black text-3xl leading-none tracking-tight">
                    {completed}<span className="text-white/40 font-bold text-xl">/{total}</span>
                  </p>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.15em] mt-1">tasks complete</p>
                </div>

                {/* Add button */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowInput(v => !v)}
                  className="w-11 h-11 bg-white rounded-[14px] flex items-center justify-center shadow-xl transition-all"
                >
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={showInput ? '#ef4444' : '#1a1a2e'}
                    strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'stroke 0.2s' }}
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

        {/* ── ADD TASK DRAWER ── */}
        <AnimatePresence>
          {showInput && (
            <motion.form
              onSubmit={handleAdd}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 bg-white dark:bg-neutral-900/80 border border-border/60 rounded-[18px] p-2 shadow-sm">
                <input
                  autoFocus
                  type="text"
                  placeholder={`Add task for ${card.label.toLowerCase()}…`}
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/40 px-3 py-2.5 outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={!newTask.trim() || addingTask}
                  className={`bg-gradient-to-r ${card.gradient} text-white rounded-[13px] px-5 py-2.5 text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all active:scale-95 shadow-md`}
                >
                  {addingTask ? '…' : 'Add'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── TASK LIST CARD ── */}
        <div className="bg-white dark:bg-neutral-900/80 rounded-[24px] border border-border/60 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3.5 flex items-center justify-between border-b border-border/50">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">Focus</p>
              <h2 className="text-sm font-black text-foreground mt-0.5 tracking-tight">
                {activeIdx === 0 ? "Today's Tasks" : "Tomorrow's Plan"}
              </h2>
            </div>
            {total > 0 && (
              <motion.span
                key={`${completed}-${total}`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`text-[10px] font-black px-3 py-1.5 rounded-full bg-gradient-to-r ${card.gradient} text-white shadow-sm`}
              >
                {completed}/{total}
              </motion.span>
            )}
          </div>

          {/* Tasks */}
          <div className="divide-y divide-border/30 max-h-[380px] overflow-y-auto overscroll-contain">
            <AnimatePresence initial={false}>
              {dayTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-14 px-5 text-center"
                >
                  <div className={`w-12 h-12 rounded-[16px] bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <p className="text-foreground font-black text-sm tracking-tight">No tasks yet</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed max-w-[180px]">
                    Tap + on the card above to plan your day
                  </p>
                </motion.div>
              ) : (
                dayTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ delay: i * 0.035, duration: 0.2 }}
                    className="flex items-center gap-3.5 px-5 py-4 group hover:bg-muted/10 dark:hover:bg-white/[0.03] transition-all"
                  >
                    {/* Checkbox */}
                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      onClick={() => toggleTask(task)}
                      className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        task.completed
                          ? `bg-gradient-to-br ${card.gradient} border-transparent shadow-sm`
                          : 'border-border/60 group-hover:border-foreground/30'
                      }`}
                    >
                      <AnimatePresence>
                        {task.completed && (
                          <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    {/* Title */}
                    <span className={`flex-1 text-sm font-semibold leading-snug transition-all ${
                      task.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'
                    }`}>
                      {task.title}
                    </span>

                    {/* Delete */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => deleteTask(task.id)}
                      className="w-7 h-7 rounded-[10px] flex items-center justify-center text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </motion.button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Footer gradient bar */}
          {total > 0 && (
            <div className={`px-5 py-3.5 bg-gradient-to-r ${card.gradient} flex items-center justify-between`}>
              <span className="text-white/75 text-[11px] font-bold">{completed} of {total} complete</span>
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
