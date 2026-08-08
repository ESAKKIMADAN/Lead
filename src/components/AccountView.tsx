'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

type ScreenState = 'main' | 'profile' | 'ego' | 'notifications' | 'about' | 'faq' | 'deactivate';

interface AccountViewProps {
  onBack?: () => void;
}

export default function AccountView({ onBack }: AccountViewProps) {
  const { profile, ego, updateProfileName, updateEgo, resetAllData, signOut } = useSupabase();
  
  // Navigation stack state
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');

  // Input states for editing
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Notification states
  const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    hasNotificationSupport ? Notification.permission : 'unsupported'
  );

  // Theme states
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync theme from document element on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    }
  };

  // Sync inputs with DB values once loaded
  useEffect(() => {
    if (profile) setEditName(profile.name);
    if (ego) {
      setEditGoal(ego.goal);
      setEditReason(ego.reason);
    }
  }, [profile, ego]);

  if (!profile || !ego) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground uppercase tracking-widest text-xs">Loading Settings...</div>
      </div>
    );
  }

  const handleSaveProfileName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    await updateProfileName(editName.trim());
    setSaving(false);
    setCurrentScreen('main');
  };

  const handleSaveEgo = async () => {
    setSaving(true);
    await updateEgo(ego.id, {
      goal: editGoal.trim() || ego.goal,
      reason: editReason.trim() || ego.reason,
    });
    setSaving(false);
    setCurrentScreen('main');
  };

  const requestNotificationPermission = async () => {
    if (hasNotificationSupport) {
      const result = await Notification.requestPermission();
      setPermissionState(result);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    await resetAllData();
    setSaving(false);
  };


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none overflow-hidden pb-32">
      
      {/* ── HEADER ── */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur-md z-40">
        <button
          onClick={() => {
            if (currentScreen === 'main') {
              if (onBack) onBack();
            } else {
              setCurrentScreen('main');
            }
          }}
          className="w-10 h-10 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-all border border-border/40 text-muted-foreground hover:text-foreground active:scale-95 shadow-sm"
          id="account-back-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <h1 className="font-heading font-semibold text-lg text-foreground/90">
          {currentScreen === 'main' ? 'Settings' : currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1)}
        </h1>

        <div className="w-10 h-10 opacity-0 pointer-events-none" /> {/* Spacer for centering */}
      </header>

      {/* ── MAIN SETTINGS BODY WITH ANIMATED SCREEN TRANSITIONS ── */}
      <div className="flex-1 max-w-md w-full mx-auto px-5 py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* SCREEN: MAIN MENU */}
          {currentScreen === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Profile card link */}
              <div 
                onClick={() => setCurrentScreen('profile')}
                className="flex items-center justify-between p-4 bg-card border border-border hover:border-border/80 rounded-2xl cursor-pointer active:scale-[0.99] transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border/30 flex items-center justify-center font-black text-lg text-foreground/80 shadow-inner">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground/90">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {ego.goal}
                    </p>
                  </div>
                </div>
                <svg className="text-muted-foreground/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* SECTION: OTHER SETTINGS */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Other settings</p>
                
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60 shadow-sm">
                  {/* Item: Profile Details */}
                  <div 
                    onClick={() => setCurrentScreen('profile')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-all active:bg-muted/50"
                  >
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">Profile details</span>
                    </div>
                    <svg className="text-muted-foreground/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>

                  {/* Item: Ego & Goals */}
                  <div 
                    onClick={() => setCurrentScreen('ego')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-all active:bg-muted/50"
                  >
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">Ego setup & goals</span>
                    </div>
                    <svg className="text-muted-foreground/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>

                  {/* Item: Notifications */}
                  <div 
                    onClick={() => setCurrentScreen('notifications')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-all active:bg-muted/50"
                  >
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">Notifications & Reminders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionState === 'granted' && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                      )}
                      <svg className="text-muted-foreground/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  {/* Item: Dark Mode Toggle */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">Dark mode</span>
                    </div>
                    <div 
                      onClick={toggleTheme}
                      className={`w-10 h-6 rounded-full p-0.5 cursor-pointer relative flex items-center transition-all ${
                        isDarkMode ? 'bg-white/20 justify-end' : 'bg-black/10 justify-start'
                      }`}
                    >
                      <motion.div 
                        layout 
                        className="w-5 h-5 bg-foreground rounded-full shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: DEACTIVATE & SIGN OUT */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60 shadow-sm">
                {/* Item: Sign Out */}
                <div 
                  onClick={signOut}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-all active:bg-muted/50"
                >
                  <div className="flex items-center gap-3.5">
                    <svg className="text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="text-xs font-medium text-foreground/85">Sign out</span>
                  </div>
                  <svg className="text-muted-foreground/60" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>

                {/* Item: Deactivate (Reset) */}
                <div 
                  onClick={() => setCurrentScreen('deactivate')}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-red-950/10 transition-all active:bg-red-950/20"
                >
                  <div className="flex items-center gap-3.5">
                    <svg className="text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span className="text-xs font-medium text-red-500">Deactivate my account</span>
                  </div>
                  <svg className="text-red-900/80" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN: EDIT PROFILE */}
          {currentScreen === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Edit Profile Details</p>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-muted border border-border/60 text-foreground rounded-xl px-4 py-3 outline-none focus:border-border transition-colors text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveProfileName} 
                    disabled={saving || !editName.trim()} 
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save Name'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN: EGO & GOALS SETUP */}
          {currentScreen === 'ego' && (
            <motion.div
              key="ego"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ego & Goal Setup</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85 block mb-1.5">Goal Description</label>
                    <textarea
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      rows={3}
                      className="w-full bg-muted border border-border/60 text-foreground rounded-xl px-4 py-3 outline-none focus:border-border resize-none transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85 block mb-1.5">Why it matters (Ego Trigger)</label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                      className="w-full bg-muted border border-border/60 text-foreground rounded-xl px-4 py-3 outline-none focus:border-border resize-none transition-colors text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveEgo} 
                    disabled={saving} 
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save Goal'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN: NOTIFICATIONS */}
          {currentScreen === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notification Setup</p>
                  <p className="text-xs text-muted-foreground/85 mt-1">
                    Reminders are sent daily at 8:00 AM, 12:00 PM, and 6:00 PM to keep your goals aligned.
                  </p>
                </div>

                <div className="border-t border-border/60 pt-4 flex flex-col items-center text-center gap-4">
                  <p className="text-xs text-foreground/80">
                    Status: <span className="font-bold text-foreground">{permissionState.toUpperCase()}</span>
                  </p>

                  {permissionState !== 'granted' && permissionState !== 'unsupported' ? (
                    <button
                      onClick={requestNotificationPermission}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                    >
                      Grant Push Permissions
                    </button>
                  ) : permissionState === 'granted' ? (
                    <div className="text-xs text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl font-bold">
                      ✓ Notifications Enabled on This Device
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/85">
                      Notifications are not supported by this browser or OS.
                    </p>
                  )}
                </div>

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: ABOUT APPLICATION */}
          {currentScreen === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-6 shadow-sm">
                <div className="flex flex-col items-center gap-2">
                  <img src="/logo.svg" alt="LEAD" className="w-10 h-10 object-contain mb-2" />
                  <h3 className="font-heading font-black text-lg uppercase tracking-wider text-foreground">LEAD</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/85">Live Every Ambition Daily</p>
                  <p className="text-xs text-foreground/80 max-w-xs leading-relaxed mt-2">
                    LEAD is your relentless personal accountability engine, designed to keep your habits aligned with your goals.
                  </p>
                </div>

                <div className="text-[10px] text-muted-foreground/60 border-t border-border/60 pt-4">
                  Version 1.0.0 • Developed by SolveCrew
                </div>

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: HELP & FAQ */}
          {currentScreen === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Frequently Asked Questions</p>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  <div className="space-y-1 text-left">
                    <h4 className="text-xs font-semibold text-foreground/90">How do reminders work?</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      LEAD triggers check-in prompts 3 times daily to track if you take actions on your ego goals.
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className="text-xs font-semibold text-foreground/90">Are my details secure?</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Yes. All profile info, streak logs, and tasks are stored securely in your Supabase database.
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className="text-xs font-semibold text-foreground/90">What are "Egos"?</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      An Ego is a specific persona/goal setup that drives your daily ambition. You can edit it anytime.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: DEACTIVATE / RESET */}
          {currentScreen === 'deactivate' && (
            <motion.div
              key="deactivate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-red-950/10 border border-red-900/30 rounded-2xl p-6 space-y-4 text-center">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Confirm Account Deactivation</p>
                <p className="text-xs text-muted-foreground/85 leading-relaxed">
                  Are you sure you want to deactivate your account? This will wipe all profile details, active goals, streaking logs, and saved tasks. This cannot be undone.
                </p>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleReset} 
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
                  >
                    Yes, Reset
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-secondary text-foreground/80 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
