'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import Onboarding from '@/components/Onboarding';
import HomeChat from '@/components/HomeChat';
import CalendarView from '@/components/CalendarView';
import TodoView from '@/components/TodoView';
import NotesView from '@/components/NotesView';
import AccountView from '@/components/AccountView';
import Auth from '@/components/Auth';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'calendar' | 'todo' | 'chat' | 'notes' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'todo',
    label: 'Tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'LEAD',
    icon: (
      <svg width="22" height="22" viewBox="0 0 100 100" fill="currentColor">
        <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
        <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
        <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user, profile, loading, refreshData } = useSupabase();
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-10">
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-foreground/20 border-r-foreground/10 animate-spin" style={{ animationDuration: '1.2s' }} />
          <img src="/logo.svg" alt="LEAD" className="w-9 h-9 object-contain" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-foreground text-base font-bold tracking-[0.25em] uppercase">LEAD</p>
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.3em] uppercase">by SolveCrew</p>
        </div>
        <div className="w-40 h-[2px] rounded-full bg-foreground/5 overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-foreground/30 to-transparent rounded-full"
            style={{ animation: 'shimmer 1.4s ease-in-out infinite' }}
          />
        </div>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (!profile) return <Onboarding onComplete={() => refreshData()} />;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">

      {/* ── MAIN CONTENT with AnimatePresence for smooth tab switching ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full"
        >
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'todo' && <TodoView />}
          {activeTab === 'notes' && <NotesView />}
          {activeTab === 'chat' && <HomeChat />}
          {activeTab === 'account' && <AccountView onBack={() => setActiveTab('chat')} />}
        </motion.div>
      </AnimatePresence>

      {/* ── FLOATING NAVIGATION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-5 px-5">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 24, stiffness: 300 }}
          className="pointer-events-auto flex items-center bg-white/90 dark:bg-neutral-900/95 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCenter = tab.id === 'chat';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`relative flex flex-col items-center justify-center transition-all duration-200 active:scale-90 select-none
                  ${isCenter ? 'mx-1' : ''}
                  ${isActive ? 'text-foreground' : 'text-muted-foreground/60 hover:text-muted-foreground'}
                `}
                style={{
                  padding: isCenter ? '12px 18px' : '12px 18px',
                  minWidth: isCenter ? 52 : 52,
                }}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-[6px] rounded-[18px] bg-foreground/[0.07] dark:bg-foreground/10"
                    transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                  />
                )}

                {/* Icon */}
                <span className={`relative z-10 transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {tab.icon}
                </span>

                {/* Label */}
                <span className={`relative z-10 mt-0.5 font-semibold tracking-tight transition-all duration-200 leading-none ${
                  isActive ? 'text-[10px] opacity-100' : 'text-[9px] opacity-0 scale-75'
                }`}>
                  {tab.label}
                </span>

                {/* Active dot at bottom */}
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground"
                    transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                  />
                )}
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
