'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import Onboarding from '@/components/Onboarding';
import HomeChat from '@/components/HomeChat';
import CalendarView from '@/components/CalendarView';
import TodoView from '@/components/TodoView';
import AccountView from '@/components/AccountView';
import Auth from '@/components/Auth';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { user, profile, loading, refreshData } = useSupabase();
  const [activeTab, setActiveTab] = useState<'calendar' | 'todo' | 'chat' | 'account'>('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-10">
        {/* Logo + spinning arc */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Spinning arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/25 border-r-white/10 animate-spin" style={{ animationDuration: '1.2s' }} />
          {/* Logo — no circle bg */}
          <img src="/logo.svg" alt="LEAD" className="w-9 h-9 object-contain" />
        </div>

        {/* Text block */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white text-base font-bold tracking-[0.25em] uppercase">LEAD</p>
          <p className="text-white/30 text-[11px] font-medium tracking-[0.3em] uppercase">by SolveCrew</p>
        </div>

        {/* Shimmer bar */}
        <div className="w-40 h-[2px] rounded-full bg-white/5 overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
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

  // If the user is not authenticated, show authentication screen
  if (!user) {
    return <Auth />;
  }

  // If user is authenticated but hasn't completed onboarding/created a profile
  if (!profile) {
    return <Onboarding onComplete={() => refreshData()} />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Main Content Area */}
      <div className="w-full">
        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="calendar">
            <CalendarView />
          </motion.div>
        )}
        {activeTab === 'todo' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="todo">
            <TodoView />
          </motion.div>
        )}
        {activeTab === 'chat' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="chat">
            <HomeChat />
          </motion.div>
        )}
        {activeTab === 'account' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="account">
            <AccountView onBack={() => setActiveTab('chat')} />
          </motion.div>
        )}
      </div>

      {/* Floating Dynamic Island Menubar */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center bg-card/90 backdrop-blur-xl border border-border px-6 py-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] gap-8 hover:scale-[1.01] transition-all duration-300">
          
          {/* Calendar Tab */}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center transition-all relative active:scale-95 ${
              activeTab === 'calendar' ? 'text-foreground scale-110' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Habit Tracker"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          {/* Todo Tab */}
          <button
            onClick={() => setActiveTab('todo')}
            className={`flex flex-col items-center justify-center transition-all relative active:scale-95 ${
              activeTab === 'todo' ? 'text-foreground scale-110' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Daily Tasks"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>

          {/* Main Logo Tab (Chat) */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center justify-center transition-all active:scale-95 ${
              activeTab === 'chat' ? 'text-foreground scale-110' : 'text-muted-foreground hover:text-foreground hover:scale-105'
            }`}
            title="AI Accountability Coach"
          >
            <svg 
              width="21" 
              height="21" 
              viewBox="0 0 100 100" 
              fill="currentColor"
              className="transition-all"
            >
              <polygon points="50,15 15,35 15,47 50,27 85,47 85,35" />
              <polygon points="50,33 15,53 15,65 50,45 85,65 85,53" />
              <polygon points="50,51 15,71 15,83 50,63 85,83 85,71" />
            </svg>
          </button>

          {/* Account Tab */}
          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center transition-all relative active:scale-95 ${
              activeTab === 'account' ? 'text-foreground scale-110' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Settings"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
