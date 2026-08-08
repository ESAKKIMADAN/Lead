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
  const { profile, ego, tasks, logs, toggleTask, deleteTask, addTask } = useSupabase();

  // Load tasks and logs
  const allShortTermTasks = tasks.filter(t => t.type === 'short_term');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Selected date defaults to today
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground uppercase tracking-widest text-sm animate-pulse">Loading Planner...</p>
      </div>
    );
  }

  // Filter tasks for the selected date
  const selectedDateStr = selectedDate.toDateString();
  const tasksForSelectedDate = allShortTermTasks.filter(task => {
    const taskDate = task.target_date 
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return taskDate === selectedDateStr;
  });

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

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    await addTask(
      title,
      'short_term',
      undefined,
      selectedDate.toISOString()
    );
    setNewTaskTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask(e);
    }
  };

  const completedTasksCount = tasksForSelectedDate.filter(t => t.completed).length;
  const progressPercent = tasksForSelectedDate.length > 0 ? Math.round((completedTasksCount / tasksForSelectedDate.length) * 100) : 0;

  // Date comparison threshold (start of today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSelectedDateToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-100 pb-32">
      <div className="max-w-xl mx-auto px-5 py-8 space-y-6">
        
        {/* Calendar Card */}
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6">
          {/* Calendar Month Selector */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={handlePrevMonth} 
              className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800/40 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-all text-xs active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-300">
              {MONTHS[monthIdx]} {year}
            </h2>
            <button 
              onClick={handleNextMonth} 
              className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800/40 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-all text-xs active:scale-95"
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
              <span key={day} className="font-bold text-neutral-500 uppercase tracking-wider">{day}</span>
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
                cellClass = 'opacity-20 cursor-not-allowed text-neutral-500';
                clickHandler = () => {};
                
                const status = getDayStatusString(year, monthIdx, cell.day);
                if (status === 'yes') {
                  cellClass += ' bg-emerald-500/10 text-emerald-500/80 border border-emerald-500/20';
                } else if (status === 'no') {
                  cellClass += ' bg-red-500/10 text-red-500/80 border border-red-500/20';
                }
              } else {
                if (isSelected) {
                  cellClass = 'bg-white/15 text-white font-bold';
                } else if (isCellToday) {
                  cellClass = 'bg-neutral-900 text-white font-bold';
                } else {
                  cellClass = 'bg-neutral-950/40 border border-neutral-900/40 hover:bg-neutral-900/50 text-neutral-300';
                }
              }

              return (
                <div
                  key={cell.key}
                  onClick={clickHandler}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-xs cursor-pointer active:scale-95 ${cellClass}`}
                >
                  <span>{cell.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
