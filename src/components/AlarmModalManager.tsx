'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase, type Task } from '@/lib/SupabaseContext';
import { playAlarmSound, stopAlarmSound } from '@/lib/alarmAudio';
import { Bell, CheckCircle2, Clock, Volume2, VolumeX } from 'lucide-react';

function normalizeToHHMM(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  const isPm = clean.includes('pm');
  const isAm = clean.includes('am');

  const rawTime = clean.replace(/am|pm/g, '').trim();
  const parts = rawTime.split(':').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return null;

  let hours = parts[0];
  const minutes = parts[1];

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function AlarmModalManager() {
  const { tasks, ego, toggleTask } = useSupabase();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [snoozedMap, setSnoozedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTask) return; // Already ringing an alarm modal

      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const nowMs = now.getTime();

      for (const task of tasks) {
        if (task.completed) continue;

        const dismissKey = `${task.id}_${currentHHMM}`;
        if (dismissedKeys.has(dismissKey)) continue;

        let isDue = false;

        // Check 1: Scheduled Time matches current local HH:mm
        const normalizedScheduled = normalizeToHHMM(task.scheduled_time);
        if (normalizedScheduled && normalizedScheduled === currentHHMM) {
          isDue = true;
        }

        // Check 2: Snoozed alarm time reached
        if (snoozedMap[task.id] && nowMs >= snoozedMap[task.id]) {
          isDue = true;
        }

        if (isDue) {
          setActiveTask(task);
          playAlarmSound();
          break;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks, activeTask, dismissedKeys, snoozedMap]);

  const handleDismiss = async () => {
    stopAlarmSound();

    if (activeTask) {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dismissKey = `${activeTask.id}_${currentHHMM}`;

      setDismissedKeys(prev => new Set(prev).add(dismissKey));

      // Remove from snooze map if snoozed
      setSnoozedMap(prev => {
        const copy = { ...prev };
        delete copy[activeTask.id];
        return copy;
      });

      // Mark task completed
      await toggleTask(activeTask);
    }

    setActiveTask(null);
  };

  const handleSnooze = () => {
    stopAlarmSound();

    if (activeTask) {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dismissKey = `${activeTask.id}_${currentHHMM}`;

      setDismissedKeys(prev => new Set(prev).add(dismissKey));

      // Snooze for 5 minutes (5 * 60 * 1000 ms)
      const snoozeUntilMs = Date.now() + 5 * 60 * 1000;
      setSnoozedMap(prev => ({ ...prev, [activeTask.id]: snoozeUntilMs }));
    }

    setActiveTask(null);
  };

  return (
    <AnimatePresence>
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          {/* Pulsing background ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.2 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="absolute w-96 h-96 rounded-full bg-amber-500/20 pointer-events-none"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-[#161616] border border-amber-500/40 rounded-[36px] p-8 space-y-6 text-center shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Top ringing bell icon */}
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ rotate: [-15, 15, -15, 15, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, repeatDelay: 0.4 }}
                className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg"
              >
                <Bell className="w-10 h-10 stroke-[2.5]" />
              </motion.div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  ⏰ TASK ALARM
                </span>
                <p className="text-xs text-neutral-400 pt-1">
                  Scheduled for {activeTask.scheduled_time || 'Now'}
                </p>
              </div>
            </div>

            {/* Task Info Box */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-2 text-left">
              <h2 className="font-heading font-bold text-xl text-neutral-100 leading-tight">
                {activeTask.title}
              </h2>
              {ego && (
                <p className="text-xs text-neutral-400 line-clamp-2">
                  Goal alignment: <span className="text-neutral-300 font-medium">{ego.goal}</span>
                </p>
              )}
            </div>

            {/* Alarm Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={handleDismiss}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                Dismiss & Complete
              </button>

              <button
                onClick={handleSnooze}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/50 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Snooze (5 Mins)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
