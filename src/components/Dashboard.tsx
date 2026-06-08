'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type NotificationLog, type Task } from '@/lib/db';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationModal from './Notification';
import ChatInterface from './ChatInterface';
import AddTaskModal from './AddTaskModal';
import DailyCheckIn from './DailyCheckIn';

export default function Dashboard() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const ego = useLiveQuery(() => db.egos.toCollection().first());
  const tasks = useLiveQuery(() => db.tasks.where('type').equals('short_term').toArray()) || [];
  
  const [activeNotification, setActiveNotification] = useState<NotificationLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Show daily check-in once per day
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem(`checkin_date_${profile.id}`);
    if (lastCheckIn !== today) {
      // Small delay so page loads first
      const timer = setTimeout(() => setShowCheckIn(true), 600);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Hourly system notification interval
  useEffect(() => {
    if (!profile || !ego) return;

    const interval = setInterval(() => {
      const hours = new Date().getHours();
      const timeOfDay = hours < 12 ? 'morning' : hours < 17 ? 'lunch' : 'evening';
      simulateLead(timeOfDay);
    }, 3600000); // 3600000ms = 1 hour

    return () => clearInterval(interval);
  }, [profile, ego]);

  useEffect(() => {
    async function seedTasks() {
      if (!profile) return;
      const count = await db.tasks.count();
      if (count === 0) {
        await db.tasks.bulkAdd([
          { id: crypto.randomUUID(), userId: profile.id, title: 'Morning Walk', type: 'short_term', scheduledTime: '06:00', completed: true, createdAt: new Date().toISOString() },
          { id: crypto.randomUUID(), userId: profile.id, title: 'Study DSA', type: 'short_term', scheduledTime: '20:00', completed: true, createdAt: new Date().toISOString() },
          { id: crypto.randomUUID(), userId: profile.id, title: 'Read 20 Pages', type: 'short_term', completed: false, createdAt: new Date().toISOString() },
        ]);
      }
    }
    seedTasks();
  }, [profile]);

  if (!profile || !ego) return null;

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  const toggleTask = async (task: Task) => {
    await db.tasks.update(task.id, { completed: !task.completed });
  };

  const handleCheckInComplete = () => {
    const today = new Date().toDateString();
    localStorage.setItem(`checkin_date_${profile.id}`, today);
    setShowCheckIn(false);
  };

  const simulateLead = async (timeOfDay: 'morning' | 'lunch' | 'evening') => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }

    setLoading(true);
    try {
      const payload = {
        user_name: profile.name,
        ego_profile: {
          goal: ego.goal,
          reason: ego.reason,
          category: ego.category,
        },
        today_task: 'Execute daily systems',
        current_streak: profile.streak || 18,
        last_completed: new Date().toISOString(),
        time_of_day: timeOfDay,
        completed_today: timeOfDay === 'evening' ? null : true,
      };

      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      const logEntry: NotificationLog = {
        id: crypto.randomUUID(),
        userId: profile.id,
        taskId: 'simulated-task-id',
        timeOfDay,
        notificationTitle: data.notification_title,
        notificationBody: data.notification_body,
        tone: data.tone,
        microAction: data.micro_action,
        opened: false,
      };

      await db.notificationLog.add(logEntry);

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const n = new Notification(data.notification_title, {
            body: data.notification_body,
            requireInteraction: true,
          });

          if ('vibrate' in navigator) {
            navigator.vibrate(timeOfDay === 'morning' ? [100, 50, 100] : [200, 100, 200, 100, 400]);
          }

          n.onclick = () => {
            window.focus();
            setActiveNotification(logEntry);
            n.close();
          };
        } catch (err) {
          console.warn('Native notification failed, falling back to in-app modal', err);
          setActiveNotification(logEntry);
        }
      } else {
        setActiveNotification(logEntry);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to LEAD core. Check API keys.');
    } finally {
      setLoading(false);
    }
  };

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col max-w-5xl mx-auto space-y-12 pb-32">
      <header className="flex justify-between items-center border-b border-border pb-6 mt-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">{greeting}, {profile.name} 👋</h1>
          <p className="text-muted-foreground text-sm mt-2 uppercase tracking-widest">
            {ego.goal}
          </p>
        </motion.div>
        <div className="flex items-center gap-3">
          {/* Account button */}
          <button
            id="dashboard-account-btn"
            onClick={() => router.push('/account')}
            className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground font-black text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
            title="Account"
          >
            {profile.name.charAt(0)}
          </button>
          <button
            id="dashboard-lead-btn"
            onClick={() => setShowChat(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            Open LEAD
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Progress & Tasks */}
        <div className="md:col-span-8 space-y-8">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Current Streak</p>
               <p className="text-4xl font-heading font-bold">{profile.streak || 18} Days</p>
             </div>
             <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Next Reminder</p>
               <p className="text-4xl font-heading font-bold">8:00 PM</p>
             </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-heading font-bold">Today's Progress</h2>
              <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progressPercent}%` }} 
                className="bg-primary h-full rounded-full"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Daily Systems (Tasks)</h2>
              <button 
                id="dashboard-add-task-btn"
                onClick={() => setShowAddTask(true)}
                className="text-xs font-bold bg-secondary text-secondary-foreground px-3 py-1 rounded-md uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                + Add Task
              </button>
            </div>
            <div className="space-y-4">
              {tasks.map(task => (
                <label key={task.id} className="flex items-center space-x-4 cursor-pointer group">
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                    {task.completed && <span className="text-primary-foreground font-bold text-lg">✓</span>}
                  </div>
                  <span className={`text-xl font-sans transition-all ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                  <input type="checkbox" className="hidden" checked={task.completed} onChange={() => toggleTask(task)} />
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Motivation & Sim */}
        <div className="md:col-span-4 space-y-8">
          
          {/* Daily Check-In re-trigger */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Daily Check-In</h2>
            <p className="text-sm text-foreground/70 mb-4">LEAD checks in daily to keep you accountable.</p>
            <button
              id="dashboard-checkin-btn"
              onClick={() => setShowCheckIn(true)}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Check In Now ⚡
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Motivation Feed</h2>
            <p className="text-2xl font-sans italic text-foreground/90">
              "Discipline is remembering what you want most."
            </p>
            <p className="text-sm text-muted-foreground mt-4">— LEAD Core</p>
          </div>

        </div>

      </main>

      {/* Daily Check-In Overlay */}
      {showCheckIn && profile && ego && (
        <DailyCheckIn
          profile={profile}
          ego={ego}
          onComplete={handleCheckInComplete}
        />
      )}

      {showChat && (
        <ChatInterface profile={profile} ego={ego} onClose={() => setShowChat(false)} />
      )}

      {showAddTask && (
        <AddTaskModal profileId={profile.id} onClose={() => setShowAddTask(false)} />
      )}

      {activeNotification && (
        <NotificationModal 
          notification={activeNotification}
          onDismiss={() => setActiveNotification(null)}
          onAction={async (response, action) => {
            await db.notificationLog.update(activeNotification.id, { response });
            setActiveNotification(null);
          }}
        />
      )}
    </div>
  );
}
