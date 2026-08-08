'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Month gradient palette
const MONTH_GRADIENTS = [
  'from-cyan-500 via-teal-500 to-emerald-600',    // Jan
  'from-rose-400 via-pink-400 to-fuchsia-500',    // Feb
  'from-violet-500 via-purple-500 to-indigo-600', // Mar
  'from-green-500 via-emerald-500 to-teal-500',   // Apr
  'from-orange-400 via-amber-400 to-yellow-400',  // May
  'from-cyan-600 via-sky-500 to-blue-600',        // Jun
  'from-orange-500 via-red-400 to-rose-500',      // Jul
  'from-amber-400 via-orange-400 to-red-500',     // Aug
  'from-emerald-500 via-teal-500 to-cyan-600',    // Sep
  'from-orange-600 via-amber-500 to-yellow-500',  // Oct
  'from-blue-600 via-indigo-500 to-violet-600',   // Nov
  'from-violet-600 via-purple-500 to-fuchsia-600',// Dec
];

export default function CalendarView() {
  const { profile, ego, tasks, logs, deleteTask, addTask } = useSupabase();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();
  const gradientClass = MONTH_GRADIENTS[monthIdx];

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest animate-pulse">Loading Calendar...</p>
        </div>
      </div>
    );
  }

  // Events for selected date
  const selectedDateStr = selectedDate.toDateString();
  const eventsForSelectedDate = tasks
    .filter(t => t.type === 'event')
    .filter(event => event.target_date
      ? new Date(event.target_date).toDateString() === selectedDateStr
      : false
    )
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

  // Day status from logs
  const getDayStatus = (y: number, m: number, d: number) => {
    const dateStr = new Date(y, m, d).toDateString();
    const dayLogs = logs.filter(log => {
      const logDate = log.delivered_at ? new Date(log.delivered_at) : new Date();
      return logDate.toDateString() === dateStr && log.time_of_day === 'evening';
    });
    if (dayLogs.length === 0) return 'none';
    if (dayLogs.some(l => l.response === 'yes')) return 'yes';
    if (dayLogs.some(l => l.response === 'no')) return 'no';
    return 'none';
  };

  // Grid cells
  const firstDayIndex = new Date(year, monthIdx, 1).getDay();
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const cells: { day: number | null; key: string }[] = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push({ day: null, key: `pad-${i}` });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d, key: `day-${d}` });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newEventTitle.trim();
    if (!title) return;
    await addTask(title, 'event', newEventTime || undefined, selectedDate.toISOString());
    setNewEventTitle('');
    setNewEventTime('12:00');
    setIsAddingEvent(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-md mx-auto px-4 pt-8 pb-4 space-y-5">

        {/* ── CALENDAR HERO CARD ── */}
        <motion.div
          key={`${year}-${monthIdx}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`relative rounded-3xl bg-gradient-to-br ${gradientClass} p-6 shadow-xl overflow-hidden`}
        >
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Month header */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <button
              onClick={() => setCurrentDate(new Date(year, monthIdx - 1, 1))}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-90 backdrop-blur-sm"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-white font-black text-xl tracking-tight">{MONTHS[monthIdx]}</p>
              <p className="text-white/60 text-xs font-bold">{year}</p>
            </div>
            <button
              onClick={() => setCurrentDate(new Date(year, monthIdx + 1, 1))}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-90 backdrop-blur-sm"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2 relative z-10">
            {WEEKDAYS.map(d => (
              <span key={d} className="text-[10px] font-black text-white/60 uppercase">{d}</span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 relative z-10">
            {cells.map(cell => {
              if (cell.day === null) return <div key={cell.key} className="aspect-square" />;

              const cellDate = new Date(year, monthIdx, cell.day);
              const isPast = cellDate < today;
              const isCellToday = cellDate.toDateString() === new Date().toDateString();
              const isSelected = selectedDate.toDateString() === cellDate.toDateString();
              const hasEvent = tasks.some(t =>
                t.type === 'event' && t.target_date &&
                new Date(t.target_date).toDateString() === cellDate.toDateString()
              );

              const status = isPast ? getDayStatus(year, monthIdx, cell.day) : 'none';

              return (
                <button
                  key={cell.key}
                  onClick={() => !isPast && setSelectedDate(cellDate)}
                  disabled={isPast}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-90 relative ${
                    isSelected
                      ? 'bg-white text-foreground shadow-md'
                      : isCellToday
                      ? 'bg-white/25 text-white backdrop-blur-sm ring-1 ring-white/40'
                      : isPast
                      ? status === 'yes'
                        ? 'bg-emerald-500/20 text-emerald-100 opacity-60'
                        : status === 'no'
                        ? 'bg-red-500/20 text-red-100 opacity-60'
                        : 'text-white/30 cursor-not-allowed opacity-40'
                      : 'text-white hover:bg-white/15'
                  }`}
                >
                  {cell.day}
                  {hasEvent && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── MEETINGS & EVENTS CARD ── */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-border/60">
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Schedule</p>
              <h2 className="text-base font-black text-foreground mt-0.5">
                Meetings & Events
              </h2>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setIsAddingEvent(v => !v)}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                isAddingEvent ? 'bg-foreground text-background' : 'bg-muted border border-border text-foreground'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {isAddingEvent
                  ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                  : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
                }
              </svg>
            </button>
          </div>

          {/* Add Event Form */}
          <AnimatePresence>
            {isAddingEvent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddEvent} className="px-5 py-3 flex gap-2 bg-muted/30 border-b border-border/60">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Event or meeting name..."
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    className="flex-1 bg-muted border border-border/60 text-foreground placeholder-muted-foreground/60 rounded-xl px-3 py-2.5 outline-none focus:border-foreground/40 transition-colors text-sm"
                    required
                  />
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="bg-muted border border-border/60 text-foreground rounded-xl px-2.5 py-2.5 outline-none focus:border-foreground/40 transition-colors text-sm w-[86px]"
                  />
                  <button
                    type="submit"
                    disabled={!newEventTitle.trim()}
                    className="bg-foreground text-background font-bold text-xs uppercase tracking-widest rounded-xl px-4 py-2.5 disabled:opacity-40 transition-all active:scale-95"
                  >
                    Add
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Events List */}
          <div className="max-h-[280px] overflow-y-auto divide-y divide-border/40">
            <AnimatePresence initial={false}>
              {eventsForSelectedDate.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center px-6"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-3 shadow-md`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="text-foreground font-bold text-sm">Nothing scheduled</p>
                  <p className="text-muted-foreground text-xs mt-1 max-w-[200px] leading-relaxed">
                    Tap + to add a meeting or important event
                  </p>
                </motion.div>
              ) : (
                eventsForSelectedDate.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 px-5 py-3.5 group hover:bg-muted/20 transition-all"
                  >
                    {/* Time badge */}
                    {event.scheduled_time && (
                      <span className={`text-[10px] font-black bg-gradient-to-br ${gradientClass} text-white px-2.5 py-1 rounded-xl flex-shrink-0 shadow-sm`}>
                        {event.scheduled_time}
                      </span>
                    )}

                    <span className="flex-1 text-sm font-semibold text-foreground/90">{event.title}</span>

                    <button
                      onClick={() => deleteTask(event.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                      title="Remove event"
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

          {/* Count footer */}
          {eventsForSelectedDate.length > 0 && (
            <div className="px-5 py-3 bg-muted/20 border-t border-border/40">
              <span className="text-muted-foreground text-[11px] font-medium">
                {eventsForSelectedDate.length} event{eventsForSelectedDate.length !== 1 ? 's' : ''} scheduled
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
