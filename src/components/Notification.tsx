'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type NotificationLog } from '@/lib/db';
import { useState } from 'react';

export default function Notification({
  notification,
  onDismiss,
  onAction
}: {
  notification: NotificationLog;
  onDismiss: () => void;
  onAction: (response: 'yes' | 'no', microAction?: string) => void;
}) {
  const [microActionInput, setMicroActionInput] = useState('');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-card border border-border shadow-2xl rounded-2xl p-6 z-50"
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-heading font-bold uppercase tracking-wide pr-4">
            {notification.notificationTitle}
          </h3>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <p className="text-lg text-foreground/90 mb-6 font-sans">
          {notification.notificationBody}
        </p>

        {notification.microAction && (
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Micro-Action Required</p>
            <p className="text-sm text-foreground/80 mb-3">{notification.microAction}</p>
            <input 
              type="text" 
              placeholder="Type your commitment here..." 
              value={microActionInput}
              onChange={(e) => setMicroActionInput(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}

        {notification.timeOfDay === 'evening' ? (
          <div className="flex space-x-4">
            <button
              onClick={() => onAction('yes', microActionInput)}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90"
            >
              YES
            </button>
            <button
              onClick={() => onAction('no', microActionInput)}
              className="flex-1 bg-destructive text-destructive-foreground py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90"
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAction('yes', microActionInput)}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90"
          >
            Acknowledged
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
