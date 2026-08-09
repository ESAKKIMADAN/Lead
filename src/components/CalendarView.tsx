'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, X } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
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

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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

  const eventsOnDay = (d: number) =>
    tasks.filter(t => t.type === 'event' && t.target_date &&
      new Date(t.target_date).toDateString() === new Date(year, monthIdx, d).toDateString()
    ).length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 pt-12 select-none font-sans">
      <div className="max-w-md mx-auto px-6 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start">
          <h1 className="text-5xl font-medium leading-[1.1] tracking-tight text-white">
            My<br/>Calendar
          </h1>
          <button
            onClick={() => setShowAddEvent(true)}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* ── MONTH CALENDAR CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${monthIdx}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-[#151515] rounded-[40px] p-6 border border-white/5 space-y-6"
          >
            {/* Month Nav Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentDate(new Date(year, monthIdx - 1, 1))}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-2xl font-medium text-white">{MONTHS[monthIdx]}</p>
                <p className="text-sm font-medium text-white/50">{year}</p>
              </div>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIdx + 1, 1))}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, idx) => (
                <div key={idx} className="text-center text-xs font-semibold text-white/30 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
              {cells.map(cell => {
                if (!cell.day) return <div key={cell.key} className="aspect-square" />;
                const cellDate = new Date(year, monthIdx, cell.day);
                const isPast = cellDate < todayBoundary;
                const isToday = cellDate.toDateString() === new Date().toDateString();
                const isSelected = selectedDate.toDateString() === cellDate.toDateString();
                const hasEv = eventsOnDay(cell.day) > 0;
                const status = isPast ? getDayStatus(year, monthIdx, cell.day) : 'none';

                return (
                  <button
                    key={cell.key}
                    onClick={() => !isPast && setSelectedDate(cellDate)}
                    disabled={isPast}
                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-medium transition-all relative ${
                      isSelected
                        ? 'bg-card-yellow text-black scale-105 z-10'
                        : isToday
                        ? 'border border-card-yellow text-card-yellow'
                        : isPast
                        ? status === 'yes'
                          ? 'bg-white/5 text-white/50'
                          : 'text-white/20 cursor-not-allowed'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {cell.day}
                    {hasEv && (
                      <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-black' : 'bg-card-yellow'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── SCHEDULED EVENTS LIST ── */}
        <div>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-2xl font-medium text-white">
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' })}
            </h3>
            <span className="text-sm font-medium text-white/50 px-3 py-1 bg-white/10 rounded-full">
              {eventsForDate.length} {eventsForDate.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>

          <div className="space-y-4">
            {eventsForDate.length === 0 ? (
              <div className="bg-card-purple/10 rounded-[32px] p-10 text-center border border-card-purple/20">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-card-purple opacity-50" />
                <p className="text-lg font-medium text-white/70">No events scheduled</p>
                <p className="text-sm text-white/40 mt-1">Tap + to add an event</p>
              </div>
            ) : (
              eventsForDate.map(e => (
                <div key={e.id} className="p-5 rounded-[32px] bg-card-purple text-black flex flex-col justify-between min-h-[120px]">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-xl leading-tight pr-4">{e.title}</h4>
                    <button
                      onClick={() => deleteTask(e.id)}
                      className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center flex-shrink-0 text-black/60 hover:text-black transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-black/10 self-start px-3 py-1.5 rounded-full mt-2">
                    <Clock className="w-4 h-4 opacity-70" />
                    <span className="text-sm font-semibold">{e.scheduled_time || '12:00'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>


      {/* Add form Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddEvent(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-md bg-[#111] sm:rounded-[40px] rounded-t-[40px] p-6 space-y-6 shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-2xl text-white">New Event</h3>
                <button onClick={() => setShowAddEvent(false)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <input
                autoFocus
                type="text"
                placeholder="Event title..."
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                className="w-full bg-transparent text-white font-medium text-2xl placeholder-white/30 outline-none"
                required
              />

              <div className="flex gap-4">
                <div className="flex-1 bg-white/5 rounded-3xl p-4 border border-white/5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-full bg-transparent text-white text-lg font-medium outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAddEvent}
                disabled={!newEventTitle.trim()}
                className="w-full bg-card-purple text-black py-4 rounded-[24px] font-semibold text-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                Add Event
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
