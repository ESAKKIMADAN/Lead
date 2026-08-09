'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// Month card configs — each month gets its own gradient + blobs
const MONTH_CONFIGS = [
  { gradient: 'from-[#0fbcf9] via-[#07d7f6] to-[#48dbfb]', blob1: 'bg-cyan-300/30', blob2: 'bg-white/20' },       // Jan
  { gradient: 'from-[#f8a5c2] via-[#f56fa8] to-[#e84393]', blob1: 'bg-pink-300/30', blob2: 'bg-white/20' },        // Feb
  { gradient: 'from-[#a29bfe] via-[#6c5ce7] to-[#8854d0]', blob1: 'bg-purple-300/30', blob2: 'bg-white/20' },      // Mar
  { gradient: 'from-[#55efc4] via-[#00b894] to-[#00cec9]', blob1: 'bg-emerald-300/30', blob2: 'bg-white/20' },     // Apr
  { gradient: 'from-[#fdcb6e] via-[#e17055] to-[#d63031]', blob1: 'bg-orange-300/30', blob2: 'bg-yellow-200/20' }, // May
  { gradient: 'from-[#74b9ff] via-[#0984e3] to-[#0652dd]', blob1: 'bg-blue-300/30', blob2: 'bg-white/20' },        // Jun
  { gradient: 'from-[#f9a826] via-[#fd7e3b] to-[#e84393]', blob1: 'bg-orange-300/30', blob2: 'bg-pink-300/20' },   // Jul
  { gradient: 'from-[#f9ca24] via-[#f0932b] to-[#e55039]', blob1: 'bg-yellow-200/30', blob2: 'bg-orange-200/20' }, // Aug
  { gradient: 'from-[#55efc4] via-[#00b894] to-[#0fbcf9]', blob1: 'bg-teal-300/30', blob2: 'bg-cyan-200/20' },     // Sep
  { gradient: 'from-[#e67e22] via-[#d35400] to-[#c0392b]', blob1: 'bg-orange-400/30', blob2: 'bg-red-200/20' },    // Oct
  { gradient: 'from-[#74b9ff] via-[#6c5ce7] to-[#a29bfe]', blob1: 'bg-indigo-300/30', blob2: 'bg-purple-200/20' },// Nov
  { gradient: 'from-[#a29bfe] via-[#e84393] to-[#f9a826]', blob1: 'bg-violet-300/30', blob2: 'bg-pink-200/20' },   // Dec
];

export default function CalendarView() {
  const { profile, ego, tasks, logs, deleteTask, addTask } = useSupabase();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [showAddEvent, setShowAddEvent] = useState(false);

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();
  const config = MONTH_CONFIGS[monthIdx];

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest">Loading Calendar...</p>
        </div>
      </div>
    );
  }

  const selectedDateStr = selectedDate.toDateString();
  const eventsForDate = tasks
    .filter(t => t.type === 'event' && t.target_date)
    .filter(e => new Date(e.target_date!).toDateString() === selectedDateStr)
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

  const getDayStatus = (y: number, m: number, d: number) => {
    const dateStr = new Date(y, m, d).toDateString();
    const dayLogs = logs.filter(l => {
      const ld = l.delivered_at ? new Date(l.delivered_at) : new Date();
      return ld.toDateString() === dateStr && l.time_of_day === 'evening';
    });
    if (!dayLogs.length) return 'none';
    if (dayLogs.some(l => l.response === 'yes')) return 'yes';
    if (dayLogs.some(l => l.response === 'no')) return 'no';
    return 'none';
  };

  const firstDay = new Date(year, monthIdx, 1).getDay();
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const cells: { day: number | null; key: string }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: `p${i}` });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, key: `d${d}` });

  const todayBoundary = new Date();
  todayBoundary.setHours(0, 0, 0, 0);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newEventTitle.trim();
    if (!t) return;
    await addTask(t, 'event', newEventTime || undefined, selectedDate.toISOString());
    setNewEventTitle('');
    setNewEventTime('12:00');
    setShowAddEvent(false);
  };

  // Count events for a date
  const eventsOnDay = (d: number) =>
    tasks.filter(t => t.type === 'event' && t.target_date &&
      new Date(t.target_date).toDateString() === new Date(year, monthIdx, d).toDateString()
    ).length;

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0d0d0d] text-foreground pb-32">
      <div className="max-w-md mx-auto px-5 pt-9 pb-4">

        {/* ── PAGE HEADER ── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Schedule</p>
            <h1 className="text-2xl font-black text-foreground mt-0.5">Calendar</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* ── MONTH HERO CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${monthIdx}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`relative rounded-[28px] bg-gradient-to-br ${config.gradient} p-5 mb-5 shadow-2xl overflow-hidden`}
          >
            {/* Blobs */}
            <div className={`absolute -bottom-10 -right-10 w-44 h-44 ${config.blob1} rounded-full blur-2xl pointer-events-none`} />
            <div className={`absolute -top-8 -left-8 w-36 h-36 ${config.blob2} rounded-full blur-2xl pointer-events-none`} />
            <div className="absolute bottom-14 right-14 w-20 h-20 bg-white/10 rounded-full blur-sm pointer-events-none" />

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <button
                onClick={() => setCurrentDate(new Date(year, monthIdx - 1, 1))}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-2xl flex items-center justify-center transition-all active:scale-90"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-white font-black text-xl leading-none">{MONTHS[monthIdx]}</p>
                <p className="text-white/60 text-xs font-bold mt-0.5">{year}</p>
              </div>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIdx + 1, 1))}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-2xl flex items-center justify-center transition-all active:scale-90"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1.5 relative z-10">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-black text-white/50 uppercase">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 relative z-10">
              {cells.map(cell => {
                if (!cell.day) return <div key={cell.key} className="aspect-square" />;
                const cellDate = new Date(year, monthIdx, cell.day);
                const isPast = cellDate < todayBoundary;
                const isToday = cellDate.toDateString() === new Date().toDateString();
                const isSelected = selectedDate.toDateString() === cellDate.toDateString();
                const hasEv = eventsOnDay(cell.day) > 0;
                const status = isPast ? getDayStatus(year, monthIdx, cell.day) : 'none';

                return (
                  <motion.button
                    key={cell.key}
                    whileTap={!isPast ? { scale: 0.85 } : {}}
                    onClick={() => !isPast && setSelectedDate(cellDate)}
                    disabled={isPast}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all relative ${
                      isSelected
                        ? 'bg-white text-foreground shadow-lg'
                        : isToday
                        ? 'bg-white/25 text-white ring-1 ring-white/60'
                        : isPast
                        ? status === 'yes'
                          ? 'bg-white/15 text-white/50'
                          : status === 'no'
                          ? 'bg-red-500/20 text-white/40'
                          : 'text-white/25 cursor-not-allowed'
                        : 'text-white hover:bg-white/15'
                    }`}
                  >
                    {cell.day}
                    {hasEv && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-foreground/60' : 'bg-white'}`} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Selected date label */}
            <div className="mt-4 pt-3 border-t border-white/20 relative z-10">
              <p className="text-white/80 text-xs font-semibold">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-white font-black text-sm">
                {eventsForDate.length > 0
                  ? `${eventsForDate.length} event${eventsForDate.length > 1 ? 's' : ''} scheduled`
                  : 'No events scheduled'}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── EVENTS CARD ── */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/60 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Schedule</p>
              <h3 className="text-sm font-black text-foreground mt-0.5">Meetings & Events</h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddEvent(v => !v)}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                showAddEvent
                  ? `bg-gradient-to-br ${config.gradient} text-white`
                  : 'bg-muted border border-border text-foreground'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {showAddEvent
                  ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                  : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                }
              </svg>
            </motion.button>
          </div>

          {/* Add event form */}
          <AnimatePresence>
            {showAddEvent && (
              <motion.form
                onSubmit={handleAddEvent}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-border/60 bg-muted/20"
              >
                <div className="flex gap-2 px-5 py-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Meeting or event name..."
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-800 border border-border/60 text-foreground placeholder-muted-foreground/50 rounded-xl px-3 py-2.5 outline-none focus:border-foreground/30 text-sm transition-colors"
                    required
                  />
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="bg-white dark:bg-neutral-800 border border-border/60 text-foreground rounded-xl px-2 py-2.5 outline-none text-sm w-[82px] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newEventTitle.trim()}
                    className={`bg-gradient-to-br ${config.gradient} text-white rounded-xl px-4 font-black text-[11px] uppercase tracking-widest disabled:opacity-40 active:scale-95 transition-all shadow-md`}
                  >
                    Add
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Events list */}
          <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
            <AnimatePresence initial={false}>
              {eventsForDate.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-12 px-6 text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="text-foreground font-bold text-sm">Nothing scheduled</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">Tap + to add a meeting or event</p>
                </motion.div>
              ) : (
                eventsForDate.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3.5 px-5 py-4 group hover:bg-muted/10 transition-all"
                  >
                    {event.scheduled_time && (
                      <span className={`text-[10px] font-black bg-gradient-to-br ${config.gradient} text-white px-2.5 py-1.5 rounded-xl flex-shrink-0 shadow-md`}>
                        {event.scheduled_time}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-semibold text-foreground">{event.title}</span>
                    <button
                      onClick={() => deleteTask(event.id)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
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

          {eventsForDate.length > 0 && (
            <div className={`px-5 py-3.5 bg-gradient-to-r ${config.gradient}`}>
              <p className="text-white/80 text-[11px] font-bold">
                {eventsForDate.length} event{eventsForDate.length > 1 ? 's' : ''} on{' '}
                {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
