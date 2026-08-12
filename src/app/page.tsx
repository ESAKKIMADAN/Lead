'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import Onboarding from '@/components/Onboarding';
import HomeChat from '@/components/HomeChat';
import CalendarView from '@/components/CalendarView';
import TodoView from '@/components/TodoView';
import NotesView from '@/components/NotesView';
import AccountView from '@/components/AccountView';
import Auth from '@/components/Auth';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'calendar' | 'todo' | 'chat' | 'notes' | 'account';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2.5" ry="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'todo',
    label: 'Tasks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'LEAD AI',
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user, profile, loading, refreshData } = useSupabase();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [loaderColor, setLoaderColor] = useState('bg-card-purple');

  useEffect(() => {
    const colors = [
      { cls: 'bg-card-mint', hex: '#B1D4CC' },
      { cls: 'bg-card-orange', hex: '#EBA080' },
      { cls: 'bg-card-yellow', hex: '#F4E07B' },
      { cls: 'bg-card-cream', hex: '#F7EED2' },
      { cls: 'bg-card-purple', hex: '#C8B9F0' }
    ];
    const picked = colors[Math.floor(Math.random() * colors.length)];
    setLoaderColor(picked.cls);
    
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', picked.hex);
  }, []);

  useEffect(() => {
    if (!loading) {
      const meta = document.getElementById('theme-color-meta');
      if (meta) {
        const isDark = document.documentElement.classList.contains('dark');
        meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${loaderColor}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center"
        >
          <motion.svg 
            viewBox="0 0 100 100" 
            fill="currentColor"
            className="w-16 h-16 text-black"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
            <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
            <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
          </motion.svg>
        </motion.div>
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
          transition={{ duration: 0.18, ease: 'easeOut' }}
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
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-8 px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 26, stiffness: 320 }}
          className="pointer-events-auto flex items-center gap-1 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-full p-2 shadow-2xl dark:shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCenter = tab.id === 'chat';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                aria-label={tab.label}
                className={`relative flex items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-300 active:scale-95 select-none
                  ${isActive 
                    ? (isCenter ? 'text-black' : 'text-black dark:text-white') 
                    : 'text-black/40 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'}
                `}
              >
                {/* Active dynamic island pill */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className={`absolute inset-0 rounded-full ${isCenter ? 'bg-card-purple shadow-[0_0_20px_rgba(167,139,250,0.2)]' : 'bg-black/10 dark:bg-white/15'}`}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  />
                )}

                {/* Icon */}
                <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {tab.icon}
                </span>
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
