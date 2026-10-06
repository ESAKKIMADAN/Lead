'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export interface FlexibleNotificationLog {
  id?: string;
  notificationTitle?: string;
  notification_title?: string;
  notificationBody?: string;
  notification_body?: string;
  timeOfDay?: 'morning' | 'lunch' | 'evening' | 'hourly';
  time_of_day?: 'morning' | 'lunch' | 'evening' | 'hourly';
  microAction?: string;
  micro_action?: string;
  [key: string]: any;
}

export default function Notification({
  notification,
  onDismiss,
  onAction,
}: {
  notification: FlexibleNotificationLog;
  onDismiss: () => void;
  onAction: (response: 'yes' | 'no', microAction?: string) => void;
}) {
  const [microActionInput, setMicroActionInput] = useState('');

  const title = notification.notificationTitle || notification.notification_title || 'LEAD Reminder';
  const body = notification.notificationBody || notification.notification_body || '';
  const time = notification.timeOfDay || notification.time_of_day || 'morning';
  const actionText = notification.microAction || notification.micro_action;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white dark:bg-[#161616] text-foreground border border-black/10 dark:border-white/10 shadow-2xl rounded-[32px] p-6 z-50 backdrop-blur-md"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold tracking-tight pr-4">
            {title}
          </h3>
          <button 
            onClick={onDismiss} 
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-foreground/80 mb-5 leading-relaxed">
          {body}
        </p>

        {actionText && (
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 mb-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 mb-1">Micro-Action</p>
            <p className="text-sm font-medium text-foreground mb-3">{actionText}</p>
            <input 
              type="text" 
              placeholder="Your quick commitment..." 
              value={microActionInput}
              onChange={(e) => setMicroActionInput(e.target.value)}
              className="w-full bg-background border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-black dark:focus:border-white text-foreground"
            />
          </div>
        )}

        {time === 'evening' ? (
          <div className="flex gap-3">
            <button
              onClick={() => onAction('yes', microActionInput)}
              className="flex-1 bg-black text-white dark:bg-white dark:text-black py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-opacity"
            >
              YES
            </button>
            <button
              onClick={() => onAction('no', microActionInput)}
              className="flex-1 bg-black/5 dark:bg-white/10 text-foreground py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-opacity"
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction('yes', microActionInput)}
            className="w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:opacity-90 transition-opacity"
          >
            Acknowledged
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
