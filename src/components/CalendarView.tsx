'use client';

import { useSupabase, type Task } from '@/lib/SupabaseContext';
import { motion } from 'framer-motion';
import { useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView() {
  const { profile, ego, tasks, logs, deleteTask, addTask } = useSupabase();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // State for adding new event/meeting
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('12:00');

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground uppercase tracking-widest text-sm animate-pulse">Loading Planner...</p>
      </div>
    );
  }

  // Filter events (meetings/important days) for the selected date
  const selectedDateStr = selectedDate.toDateString();
  const eventsForSelectedDate = tasks
    .filter(t => t.type === 'event')
    .filter(event => {
      return event.target_date 
        ? new Date(event.target_date).toDateString() === selectedDateStr 
        : false;
    })
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));

  // Get status for a specific date (yyyy-mm-dd)
  const getDayStatusString = (y: number, m: number, d: number) => {
    const dateToCheck = new Date(y, m, d);
    const dateStr = dateToCheck.toDateString();

    const dayLogs = logs.filter(log => {
      const logDate = log.delivered_at ? new Date(log.delivered_at) : new Date();
      return logDate.toDateString() === dateStr && log.time_of_day === 'evening';
    });

    if (dayLogs.length === 0) return 'none';
    const hasYes = dayLogs.some(l => l.response === 'yes');
    const hasNo = dayLogs.some(l => l.response === 'no');
    if (hasYes) return 'yes';
    if (hasNo) return 'no';
    return 'none';
  };

  // Helper to generate grid cells
  const firstDayIndex = new Date(year, monthIdx, 1).getDay(); // 0 = Sun
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ day: null, key: `pad-${i}` });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, key: `day-${d}` });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, monthIdx - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, monthIdx + 1, 1));
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newEventTitle.trim();
    if (!title) return;

    await addTask(
      title,
      'event',
      newEventTime || undefined,
      selectedDate.toISOString()
    );
    setNewEventTitle('');
    setNewEventTime('12:00');
  };

  // Date comparison threshold (start of today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-xl mx-auto px-5 py-8 space-y-6">
        
        {/* Calendar Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Calendar Month Selector */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={handlePrevMonth} 
              className="w-8 h-8 rounded-lg bg-secondary border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all text-xs active:scale-95 shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/90">
              {MONTHS[monthIdx]} {year}
            </h2>
            <button 
              onClick={handleNextMonth} 
              className="w-8 h-8 rounded-lg bg-secondary border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all text-xs active:scale-95 shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
            {WEEKDAYS.map((day) => (
              <span key={day} className="font-bold text-muted-foreground/80 uppercase tracking-wider">{day}</span>
            ))}
            
            {cells.map((cell) => {
              if (cell.day === null) {
                return <div key={cell.key} className="aspect-square" />;
              }

              const cellDate = new Date(year, monthIdx, cell.day);
              const isPast = cellDate < today;
              const isCellToday = cellDate.toDateString() === new Date().toDateString();
              const isSelected = selectedDate.toDateString() === cellDate.toDateString();

              let cellClass = '';
              let clickHandler = () => setSelectedDate(cellDate);

              if (isPast) {
                cellClass = 'opacity-30 cursor-not-allowed text-muted-foreground/80';
                clickHandler = () => {};
                
                const status = getDayStatusString(year, monthIdx, cell.day);
                if (status === 'yes') {
                  cellClass += ' bg-emerald-500/10 text-emerald-650 dark:text-emerald-500 border border-emerald-500/25';
                } else if (status === 'no') {
                  cellClass += ' bg-red-500/10 text-red-650 dark:text-red-500 border border-red-500/25';
                }
              } else {
                if (isSelected) {
                  cellClass = 'bg-foreground/15 text-foreground font-bold border border-foreground/30';
                } else if (isCellToday) {
                  cellClass = 'bg-secondary text-foreground border border-border font-bold shadow-sm';
                } else {
                  cellClass = 'bg-muted/40 border border-border/40 hover:bg-muted text-foreground/80';
                }
              }

              // Count events for this cell date
              const cellDateStr = cellDate.toDateString();
              const hasEvents = tasks.some(t => 
                t.type === 'event' && 
                t.target_date && 
                new Date(t.target_date).toDateString() === cellDateStr
              );

              return (
                <div
                  key={cell.key}
                  onClick={clickHandler}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-xs cursor-pointer active:scale-95 relative ${cellClass}`}
                >
                  <span className={hasEvents ? '-mt-1' : ''}>{cell.day}</span>
                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events & Meetings Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Schedule Planner</p>
              <h3 className="text-sm font-semibold text-foreground/90 mt-0.5">
                Meetings & Events • {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h3>
            </div>
            <span className="text-[10px] bg-foreground/10 text-foreground font-bold px-2.5 py-1 rounded-full">
              {eventsForSelectedDate.length} Scheduled
            </span>
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {eventsForSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
                <span className="text-2xl">📅</span>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
                  No meetings or important days set.
                </p>
              </div>
            ) : (
              eventsForSelectedDate.map(event => (
                <div key={event.id} className="flex items-center justify-between group bg-muted/20 border border-border/30 hover:border-border/60 py-2 px-3.5 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    {event.scheduled_time && (
                      <span className="text-[10px] font-bold bg-foreground text-background px-2 py-0.5 rounded shadow-sm">
                        {event.scheduled_time}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-foreground/90">{event.title}</span>
                  </div>
                  <button 
                    onClick={() => deleteTask(event.id)}
                    className="text-muted-foreground hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all p-1 hover:scale-110 active:scale-95"
                    title="Remove event"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Event Form */}
          <form onSubmit={handleAddEvent} className="flex gap-2 pt-3 border-t border-border/60">
            <input
              type="text"
              placeholder="Event or meeting title..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="flex-1 bg-muted border border-border/60 text-foreground placeholder-muted-foreground/60 rounded-xl px-3.5 py-2.5 outline-none focus:border-border transition-colors text-xs"
              required
            />
            <input
              type="time"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
              className="bg-muted border border-border/60 text-foreground rounded-xl px-2.5 py-2.5 outline-none focus:border-border transition-colors text-xs w-[90px]"
              required
            />
            <button
              type="submit"
              disabled={!newEventTitle.trim()}
              className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 font-bold uppercase tracking-widest text-[9px] rounded-xl px-4 py-2.5 transition-all active:scale-95 shadow-sm"
            >
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
