'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase } from '@/lib/SupabaseContext';
import { Flame, CheckCircle2, Circle, Plus, Trash2, CalendarDays, Zap, FileText, Bell } from 'lucide-react';
import { autoAddCalendarReminder } from '@/lib/calendarExport';
import { parseTaskDate } from '@/lib/utils';

const WEEKDAYS = [
  { day: 'M', key: 1 },
  { day: 'T', key: 2 },
  { day: 'W', key: 3 },
  { day: 'T', key: 4 },
  { day: 'F', key: 5 },
  { day: 'S', key: 6 },
  { day: 'S', key: 0 },
];

function getTasksForDate(tasks: any[], date: Date, isToday: boolean = false) {
  const dateStr = date.toDateString();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // 1. All tasks with a valid title are eligible (short_term, event, daily, reminders, tests, etc.)
  const eligible = tasks.filter(t => t && typeof t.title === 'string' && t.title.trim().length > 0);

  // Track unique IDs to avoid duplicate object references
  const seenIds = new Set<string>();
  const uniqueEligible = eligible.filter(t => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  const scheduledForDay: any[] = [];
  const rolloverCandidates: any[] = [];

  for (const task of uniqueEligible) {
    if (task.type === 'daily') {
      scheduledForDay.push(task);
      continue;
    }

    const taskDateObj = parseTaskDate(task.target_date) || parseTaskDate(task.created_at) || new Date();
    const d = taskDateObj.toDateString();

    if (d === dateStr) {
      scheduledForDay.push(task);
    } else if (isToday && !task.completed && taskDateObj < startOfDay) {
      // Past uncompleted task (rollover candidate)
      rolloverCandidates.push(task);
    }
  }

  // Deduplicate: If a task with the same title is already scheduled today,
  // do NOT duplicate it with an old remained task.
  const scheduledTitles = new Set(
    scheduledForDay.map(t => (t.title || '').trim().toLowerCase())
  );

  // Sort rollover candidates newest first so we only keep the single most recent one if multiple uncompleted past tasks had the same title
  rolloverCandidates.sort((a, b) => {
    const da = new Date(a.created_at || a.target_date || 0).getTime();
    const db = new Date(b.created_at || b.target_date || 0).getTime();
    return db - da;
  });

  const dedupedRollover: any[] = [];
  for (const r of rolloverCandidates) {
    const norm = (r.title || '').trim().toLowerCase();
    if (!norm) continue;
    if (!scheduledTitles.has(norm)) {
      scheduledTitles.add(norm);
      dedupedRollover.push({ ...r, isRollover: true });
    }
  }

  // Deduplicate scheduled tasks for the day itself if duplicate tasks were saved
  const dedupedScheduled: any[] = [];
  const seenKeys = new Set<string>();
  for (const s of scheduledForDay) {
    const norm = (s.title || '').trim().toLowerCase();
    const key = `${norm}_${s.scheduled_time || 'any'}_${s.completed ? 'done' : 'undone'}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      dedupedScheduled.push(s);
    }
  }

  return [...dedupedScheduled, ...dedupedRollover];
}

export default function TodoView() {
  const { profile, ego, tasks, toggleTask, deleteTask, addTask } = useSupabase();

  const [activeTab, setActiveTab] = useState<'daily' | 'project'>('daily');
  const [activeDateOffset, setActiveDateOffset] = useState<number>(0);
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [showInput, setShowInput] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const baseDate = new Date();
  const activeDate = new Date(baseDate);
  activeDate.setDate(baseDate.getDate() + activeDateOffset);

  const dayTasks = getTasksForDate(tasks, activeDate, activeDateOffset === 0);
  const completedTasks = dayTasks.filter(t => t.completed);
  const doingTasks = dayTasks.filter(t => !t.completed);
  const totalCount = dayTasks.length;
  const completedCount = completedTasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const streakDays = profile?.streak || 0;
  const todayDayIdx = new Date().getDay();

  const handleToggleTask = async (task: any) => {
    await toggleTask(task);
    // If completing the task, also mark any duplicate older uncompleted tasks with same title as completed
    if (!task.completed) {
      const normTitle = (task.title || '').trim().toLowerCase();
      const duplicates = tasks.filter(t => t.id !== task.id && !t.completed && (t.title || '').trim().toLowerCase() === normTitle);
      for (const dup of duplicates) {
        toggleTask(dup);
      }
    }
  };

  const handleDeleteTask = async (task: any) => {
    await deleteTask(task.id);
    // Clean up any stale uncompleted duplicate copies with the exact same title
    const normTitle = (task.title || '').trim().toLowerCase();
    const duplicates = tasks.filter(t => t.id !== task.id && (t.title || '').trim().toLowerCase() === normTitle);
    for (const dup of duplicates) {
      deleteTask(dup.id);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newTask.trim();
    if (!t) return;
    setAddingTask(true);
    // Auto trigger device alarm setup synchronously (preserves user touch gesture)
    autoAddCalendarReminder({ title: t, scheduledTime: newTime || undefined, targetDate: activeDate.toISOString(), type: 'short_term' });

    await addTask(t, 'short_term', newTime || undefined, activeDate.toISOString());

    setNewTask('');
    setShowInput(false);
    setAddingTask(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-48 pt-[calc(env(safe-area-inset-top,0px)+3rem)] sm:pt-16 select-none font-sans">
      <div className="max-w-md lg:max-w-5xl mx-auto px-6">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-5xl font-medium leading-[1.1] tracking-tight text-foreground">
            My<br/>Tasks
          </h1>
          <button
            onClick={() => setShowInput(true)}
            className="w-12 h-12 rounded-full bg-white text-black border border-black/5 dark:border-transparent flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar mb-8">
          <button
            onClick={() => { setActiveTab('daily'); setActiveDateOffset(0); }}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
              activeDateOffset === 0 ? 'border-black text-black dark:border-white dark:text-white' : 'border-black/20 text-black/50 dark:border-white/20 dark:text-white/50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => { setActiveTab('project'); setActiveDateOffset(1); }}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
              activeDateOffset === 1 ? 'border-black text-black dark:border-white dark:text-white' : 'border-black/20 text-black/50 dark:border-white/20 dark:text-white/50'
            }`}
          >
            Tomorrow
          </button>
          {activeDateOffset !== 0 && activeDateOffset !== 1 && (
            <button
              onClick={() => setActiveTab('daily')}
              className="flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium border-black text-black dark:border-white dark:text-white bg-black/5 dark:bg-white/10"
            >
              {activeDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </button>
          )}
        </div>

        {/* ── DESKTOP 2-COL / MOBILE STACK ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">

          {/* LEFT: Stats + Weekday */}
          <div className="space-y-6 mb-8 lg:mb-0">

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card-orange text-black rounded-[40px] p-6 flex flex-col justify-between shadow-sm min-h-[180px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium opacity-80">Streak</span>
                    <Flame className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-4xl font-medium">{streakDays} <span className="text-lg opacity-70">Days</span></p>
                </div>
                <div className="w-full bg-black/10 rounded-full h-1 mt-4">
                  <div className="bg-black h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="bg-card-cream text-black rounded-[40px] p-6 flex flex-col justify-between shadow-sm min-h-[180px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium opacity-80">Focus</span>
                    <Zap className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="font-medium text-lg leading-tight line-clamp-3">{ego.goal}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest opacity-60 bg-black/5 px-3 py-1.5 rounded-full self-start">Active</span>
              </div>
            </div>

            {/* Weekday row */}
            <div className="bg-white dark:bg-[#151515] rounded-[32px] p-5 border border-black/5 dark:border-white/5 flex justify-between items-center shadow-sm dark:shadow-none">
              {WEEKDAYS.map(({ day, key }) => {
                const isToday = key === todayDayIdx;
                const todayMonIdx = todayDayIdx === 0 ? 6 : todayDayIdx - 1;
                const cellMonIdx = key === 0 ? 6 : key - 1;
                const isPast = cellMonIdx < todayMonIdx;
                const offset = cellMonIdx - todayMonIdx;
                const isSelected = activeDate.getDay() === key;

                // Check if any tasks exist for this day
                const dayDate = new Date(baseDate);
                dayDate.setDate(baseDate.getDate() + offset);
                const dayDateStr = dayDate.toDateString();
                const hasTasksThisDay = tasks.some(t => {
                  if (!t || !t.title) return false;
                  if (t.type === 'daily') return true;
                  const td = parseTaskDate(t.target_date) || parseTaskDate(t.created_at);
                  return td && td.toDateString() === dayDateStr;
                });

                return (
                  <button
                    key={day + key}
                    type="button"
                    onClick={() => {
                      setActiveDateOffset(offset);
                    }}
                    className="flex flex-col items-center gap-1.5 focus:outline-none transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-card-yellow text-black shadow-md font-bold scale-110'
                        : isToday
                        ? 'border border-card-yellow text-card-yellow'
                        : isPast
                        ? 'bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50'
                        : 'bg-transparent text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}>
                      {day}
                    </div>
                    {hasTasksThisDay && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-card-yellow' : 'bg-black/40 dark:bg-white/40'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Task list */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {dayTasks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[40px] p-12 text-center shadow-sm dark:shadow-none">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20 text-foreground" />
                  <p className="text-lg font-medium text-black/70 dark:text-white/70">All clear</p>
                  <p className="text-sm text-black/40 dark:text-white/40 mt-1">Tap + to add a task</p>
                </motion.div>
              ) : (
                dayTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`p-5 rounded-[32px] flex flex-col justify-center transition-all min-h-[96px] relative overflow-hidden shadow-sm dark:shadow-none ${
                      task.completed ? 'bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 opacity-60' : 'bg-card-mint text-black border border-black/5 dark:border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <button onClick={() => handleToggleTask(task)} className="flex-shrink-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-7 h-7 text-black/40 dark:text-white/40" />
                        ) : (
                          <Circle className="w-7 h-7 text-black/30 hover:text-black/60 transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`text-lg font-medium leading-tight truncate ${task.completed ? 'line-through text-black/60 dark:text-white/60' : 'text-black'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-sm font-medium ${task.completed ? 'text-black/40 dark:text-white/40' : 'text-black/50'}`}>
                            {task.scheduled_time || 'Anytime'}
                          </p>
                          {task.isRollover && !task.completed && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-black/10 text-black/70 dark:text-black/80 px-2 py-0.5 rounded-full">
                              Carried Over
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => autoAddCalendarReminder({ title: task.title, scheduledTime: task.scheduled_time, targetDate: task.target_date, type: task.type })}
                          title="Add to Phone Calendar / Alarm"
                          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                            task.completed ? 'hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40' : 'hover:bg-black/10 text-black/60'
                          }`}
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                            task.completed ? 'hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40' : 'hover:bg-black/10 text-black/40'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>


      {/* ── ADD TASK MODAL ── */}
      <AnimatePresence>
        {showInput && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInput(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md bg-[#111] sm:rounded-[40px] rounded-t-[40px] p-6 space-y-6 shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-2xl text-white">New Task</h3>
                <button onClick={() => setShowInput(false)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <input
                autoFocus
                type="text"
                placeholder="What needs to be done?"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                className="w-full bg-transparent text-white font-medium text-2xl placeholder-white/30 outline-none"
              />

              <div className="flex gap-4">
                <div className="flex-1 bg-white/5 rounded-3xl p-4 border border-white/5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-transparent text-white text-lg font-medium outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={!newTask.trim() || addingTask}
                className="w-full bg-card-mint text-black py-4 rounded-[24px] font-semibold text-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {addingTask ? 'Saving...' : 'Add Task'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
