'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSupabase, type Task } from '@/lib/SupabaseContext';

export default function TodoView() {
  const { profile, ego, tasks, toggleTask, deleteTask, addTask } = useSupabase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground uppercase tracking-widest text-sm animate-pulse">Loading Tasks...</p>
      </div>
    );
  }

  // Filter tasks for the selected date
  const selectedDateStr = selectedDate.toDateString();
  const allShortTermTasks = tasks.filter(t => t.type === 'short_term');
  const tasksForSelectedDate = allShortTermTasks.filter(task => {
    const taskDate = task.target_date 
      ? new Date(task.target_date).toDateString()
      : new Date(task.created_at).toDateString();
    return taskDate === selectedDateStr;
  });

  const completedTasksCount = tasksForSelectedDate.filter(t => t.completed).length;
  const progressPercent = tasksForSelectedDate.length > 0 ? Math.round((completedTasksCount / tasksForSelectedDate.length) * 100) : 0;
  
  const isSelectedDateToday = selectedDate.toDateString() === new Date().toDateString();

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

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-100 pb-32">
      <div className="max-w-xl mx-auto px-5 py-8 space-y-6 animate-fade-in">
        
        {/* Planner Header Card */}
        <div className="flex justify-between items-center p-4 bg-neutral-900/20 border border-neutral-900 rounded-2xl">
          <button 
            onClick={handlePrevDay} 
            className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-900 hover:bg-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-all active:scale-95 shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          <div className="text-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {isSelectedDateToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}
            </h3>
            <p className="text-sm font-semibold text-neutral-200 mt-0.5">
              {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <button 
            onClick={handleNextDay} 
            className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-900 hover:bg-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-neutral-100 flex items-center justify-center transition-all active:scale-95 shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* To-Do list planner card */}
        <div className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle light effect */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 blur-[80px] pointer-events-none rounded-full" />
          
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Active Systems</p>
              <h2 className="text-xl font-black text-neutral-100 mt-0.5">Focus List</h2>
            </div>
            <span className="text-xs font-bold text-white bg-white/10 px-3 py-1 rounded-full">{progressPercent}% Done</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden relative z-10 border border-neutral-900">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }} 
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white h-full rounded-full"
            />
          </div>

          {/* Tasks checklist */}
          <div className="space-y-3 pt-2 relative z-10 max-h-[350px] overflow-y-auto pr-1">
            {tasksForSelectedDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <span className="text-3xl">☕</span>
                <p className="text-neutral-500 text-xs max-w-xs leading-relaxed">
                  No tasks set for this day. Plan a system below to stay locked in.
                </p>
              </div>
            ) : (
              tasksForSelectedDate.map(task => (
                <motion.div 
                  key={task.id} 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between group py-1.5 px-3 bg-neutral-950/20 hover:bg-neutral-950/60 border border-transparent hover:border-neutral-900/60 rounded-xl transition-all"
                >
                  <div 
                    onClick={() => toggleTask(task)} 
                    className="flex items-center space-x-3 cursor-pointer flex-1 select-none"
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      task.completed ? 'bg-white border-white' : 'border-neutral-800 group-hover:border-neutral-700'
                    }`}>
                      {task.completed && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs transition-all font-medium ${
                      task.completed ? 'text-neutral-500 line-through' : 'text-neutral-200'
                    }`}>
                      {task.title}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-neutral-500 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:scale-110 active:scale-95"
                    title="Remove task"
                  >
                    ✕
                  </button>
                </motion.div>
              ))
            )}
          </div>

          {/* Quick task adder */}
          <form onSubmit={handleAddTask} className="flex gap-2 pt-4 border-t border-neutral-900/60 relative z-10">
            <input
              type="text"
              placeholder={`Add task for ${selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}...`}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-neutral-950 border border-neutral-850 text-neutral-100 placeholder-neutral-600 rounded-xl px-4 py-3 outline-none focus:border-neutral-700 transition-colors text-xs shadow-inner"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="bg-white text-black hover:bg-neutral-200 font-bold uppercase tracking-widest text-[10px] rounded-xl px-5 py-3 transition-all disabled:opacity-40 shadow-md active:scale-95"
            >
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
