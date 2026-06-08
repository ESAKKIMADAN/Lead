'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '@/lib/db';
import { motion } from 'framer-motion';
import { useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView() {
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const ego = useLiveQuery(() => db.egos.toCollection().first());
  
  // Load tasks and logs
  const allShortTermTasks = useLiveQuery(() => db.tasks.where('type').equals('short_term').toArray()) || [];
  const logs = useLiveQuery(() => db.notificationLog.toArray()) || [];

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
    const taskDate = task.targetDate 
      ? new Date(task.targetDate).toDateString()
      : new Date(task.createdAt).toDateString();
    return taskDate === selectedDateStr;
  });

  // Get status for a specific date (yyyy-mm-dd)
  const getDayStatusString = (y: number, m: number, d: number) => {
    const dateToCheck = new Date(y, m, d);
    const dateStr = dateToCheck.toDateString();

    const dayLogs = logs.filter(log => {
      const logDate = log.deliveredAt ? new Date(log.deliveredAt) : new Date();
      return logDate.toDateString() === dateStr && log.timeOfDay === 'evening';
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

  const toggleTask = async (task: Task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    await db.tasks.add({
      id: crypto.randomUUID(),
      userId: profile.id,
      title,
      type: 'short_term',
      completed: false,
      targetDate: selectedDate.toISOString(),
      createdAt: new Date().toISOString(),
    });
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
    <div className="min-h-screen bg-background text-foreground pb-32">
      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">
        
        {/* Calendar Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {/* Calendar Month Selector */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={handlePrevMonth} 
              className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors text-sm"
            >
              ←
            </button>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
              {MONTHS[monthIdx]} {year}
            </h2>
            <button 
              onClick={handleNextMonth} 
              className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors text-sm"
            >
              →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
            {WEEKDAYS.map((day) => (
              <span key={day} className="font-black text-muted-foreground/60 uppercase">{day}</span>
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
                // Past days are locked/disabled
                cellClass = 'opacity-30 cursor-not-allowed text-foreground/40';
                clickHandler = () => {}; // block clicks
                
                // Still show color highlights for past record if any
                const status = getDayStatusString(year, monthIdx, cell.day);
                if (status === 'yes') {
                  cellClass += ' bg-emerald-500/10 text-emerald-500/80';
                } else if (status === 'no') {
                  cellClass += ' bg-red-500/10 text-red-500/80';
                }
              } else {
                // Today or Future: clickable/plannable
                if (isSelected) {
                  cellClass = 'bg-primary/20 border-2 border-primary text-primary font-bold shadow-[0_0_10px_rgba(255,255,255,0.15)]';
                } else if (isCellToday) {
                  cellClass = 'bg-secondary/40 border border-border/80 text-foreground font-bold';
                } else {
                  cellClass = 'bg-secondary/20 hover:bg-secondary/40 text-foreground/80';
                }
              }

              return (
                <div
                  key={cell.key}
                  onClick={clickHandler}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-xs ${cellClass}`}
                >
                  <span>{cell.day}</span>
                  {isCellToday && <span className="w-1 h-1 bg-primary rounded-full mt-0.5" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* To-Do list planner card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {isSelectedDateToday ? "Today's To-Do List" : `Planner for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </h3>
              <p className="text-lg font-bold mt-1">Daily Systems</p>
            </div>
            <span className="text-lg font-black text-primary">{progressPercent}% Done</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }} 
              className="bg-primary h-full rounded-full"
            />
          </div>

          {/* Tasks checklist */}
          <div className="space-y-3 pt-2">
            {tasksForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-6">
                No tasks planned for this day. Add one below to plan ahead!
              </p>
            ) : (
              tasksForSelectedDate.map(task => (
                <div key={task.id} className="flex items-center justify-between group py-1">
                  <label 
                    className="flex items-center space-x-3.5 cursor-pointer flex-1"
                  >
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      task.completed ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'
                    }`}>
                      {task.completed && <span className="text-primary-foreground font-black text-sm">✓</span>}
                    </div>
                    <span className={`text-[13.5px] transition-all ${
                      task.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}>
                      {task.title}
                    </span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={task.completed} 
                      onChange={() => toggleTask(task)} 
                    />
                  </label>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1.5"
                    title="Remove task"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick task adder */}
          <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder={`Add task for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}...`}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-background border border-border text-foreground px-4 py-2.5 rounded-xl outline-none focus:border-primary transition-colors text-xs"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
