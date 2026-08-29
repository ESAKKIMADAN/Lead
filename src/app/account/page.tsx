'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  subscribeUserToPush, 
  sendTestNotification, 
  scheduleTestReminder, 
  getNotificationDiagnostics 
} from '@/lib/pushNotifications';

type ScreenState = 'main' | 'profile' | 'ego' | 'notifications' | 'about' | 'faq' | 'deactivate';

export default function AccountPage() {
  const router = useRouter();
  const { profile, ego, user, updateProfileName, updateEgo, resetAllData, signOut } = useSupabase();
  
  // Navigation stack state
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');

  // Input states for editing
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  
  // Notification states
  const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    hasNotificationSupport ? Notification.permission : 'unsupported'
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Load diagnostics when notifications screen is opened
  useEffect(() => {
    if (currentScreen === 'notifications' && user) {
      getNotificationDiagnostics(user.id).then(setDiagnostics);
    }
  }, [currentScreen, user]);

  const handleEnablePush = async () => {
    if (!user) return;
    setPushLoading(true);
    setPushMessage(null);

    const res = await subscribeUserToPush(user.id);
    setPushLoading(false);

    if (res.success) {
      setPermissionState('granted');
      setPushMessage({ type: 'success', text: res.message || 'Push notifications enabled!' });
    } else {
      setPushMessage({ type: 'error', text: res.error || 'Failed to enable notifications.' });
    }

    const updatedDiag = await getNotificationDiagnostics(user.id);
    setDiagnostics(updatedDiag);
  };

  const handleSendTestPush = async () => {
    if (!user) return;
    setTestPushLoading(true);
    setPushMessage(null);

    const res = await sendTestNotification(user.id);
    setTestPushLoading(false);

    if (res.success) {
      setPushMessage({ type: 'success', text: '🔔 Test push notification dispatched!' });
    } else {
      setPushMessage({ type: 'error', text: res.error || 'Failed to send test notification.' });
    }
  };

  const handleScheduleTestReminder = async () => {
    if (!user) return;
    setScheduleLoading(true);
    setPushMessage(null);

    const res = await scheduleTestReminder(user.id, 1);
    setScheduleLoading(false);

    if (res.success) {
      setPushMessage({ type: 'success', text: res.message || '✓ Test reminder scheduled for 1 minute from now!' });
    } else {
      setPushMessage({ type: 'error', text: res.error || 'Failed to schedule test reminder.' });
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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="animate-pulse text-neutral-500 uppercase tracking-widest text-xs">Loading Settings...</div>
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
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* ── HEADER ── */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-900/60 sticky top-0 bg-[#0d0d0d]/80 backdrop-blur-md z-40">
        <button
          onClick={() => {
            if (currentScreen === 'main') {
              router.push('/');
            } else {
              setCurrentScreen('main');
            }
          }}
          className="w-10 h-10 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center transition-all border border-neutral-800/40 text-neutral-400 hover:text-neutral-100 active:scale-95"
          id="account-back-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <h1 className="font-heading font-semibold text-lg text-neutral-200">
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
                className="flex items-center justify-between p-4 bg-neutral-900/40 border border-neutral-900 hover:border-neutral-800/80 rounded-2xl cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700/30 text-neutral-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-neutral-200">{profile.name}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">
                      {ego.goal}
                    </p>
                  </div>
                </div>
                <svg className="text-neutral-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* SECTION: OTHER SETTINGS */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest px-1">Other settings</p>
                
                <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl overflow-hidden divide-y divide-neutral-950/60">
                  {/* Item: Profile Details */}
                  <div 
                    onClick={() => setCurrentScreen('profile')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-neutral-900/20 transition-all active:bg-neutral-900/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <svg className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="text-xs font-medium text-neutral-300">Profile details</span>
                    </div>
                    <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>

                  {/* Item: Ego & Goals */}
                  <div 
                    onClick={() => setCurrentScreen('ego')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-neutral-900/20 transition-all active:bg-neutral-900/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <svg className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                      <span className="text-xs font-medium text-neutral-300">Ego setup & goals</span>
                    </div>
                    <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>

                  {/* Item: Notifications */}
                  <div 
                    onClick={() => setCurrentScreen('notifications')}
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-neutral-900/20 transition-all active:bg-neutral-900/50"
                  >
                    <div className="flex items-center gap-3.5">
                      <svg className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <span className="text-xs font-medium text-neutral-300">Notifications & Reminders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionState === 'granted' && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                      )}
                      <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  {/* Item: Dark Mode Toggle */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3.5">
                      <svg className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                      <span className="text-xs font-medium text-neutral-300">Dark mode</span>
                    </div>
                    <div className="w-10 h-6 bg-neutral-800 rounded-full p-0.5 cursor-pointer relative flex items-center justify-end">
                      <motion.div 
                        layout 
                        className="w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: DEACTIVATE & SIGN OUT */}
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl overflow-hidden divide-y divide-neutral-950/60">
                {/* Item: Sign Out */}
                <div 
                  onClick={signOut}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-neutral-900/20 transition-all active:bg-neutral-900/50"
                >
                  <div className="flex items-center gap-3.5">
                    <svg className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span className="text-xs font-medium text-neutral-300">Sign out</span>
                  </div>
                  <svg className="text-neutral-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Edit Profile Details</p>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveProfileName} 
                    disabled={saving || !editName.trim()} 
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save Name'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ego & Goal Setup</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">Goal Description</label>
                    <textarea
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-500 resize-none transition-colors text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1.5">Why it matters (Ego Trigger)</label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                      className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-4 py-3 outline-none focus:border-neutral-500 resize-none transition-colors text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSaveEgo} 
                    disabled={saving} 
                    className="flex-1 bg-white text-black py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-200 transition-all disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save Goal'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 space-y-5">
                <div>
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Notification Engine</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Receive native push alerts on your lock screen and in-app ringing sound alarms when your tasks are due.
                  </p>
                </div>

                {pushMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium border ${
                      pushMessage.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}
                  >
                    {pushMessage.text}
                  </div>
                )}

                <div className="border-t border-neutral-800/60 pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Browser Permission:</span>
                    <span className="font-bold text-neutral-200 uppercase">{permissionState}</span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={handleEnablePush}
                        disabled={pushLoading}
                        className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-200 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {pushLoading ? 'Enabling...' : 'Enable Notifications'}
                      </button>

                      <button
                        onClick={handleSendTestPush}
                        disabled={testPushLoading}
                        className="flex-1 bg-neutral-800 text-neutral-200 border border-neutral-700/50 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {testPushLoading ? 'Sending...' : 'Instant Test Push'}
                      </button>
                    </div>

                    <button
                      onClick={handleScheduleTestReminder}
                      disabled={scheduleLoading}
                      className="w-full bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-900/40 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {scheduleLoading ? 'Scheduling...' : '⏱️ Schedule Test Reminder (1 min)'}
                    </button>
                  </div>
                </div>

                {/* DIAGNOSTICS PANEL */}
                {diagnostics && (
                  <div className="border-t border-neutral-800/60 pt-4 space-y-2">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">System Diagnostics</p>
                    <div className="bg-black/40 border border-neutral-800/60 rounded-xl p-3 space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Platform:</span>
                        <span className="text-neutral-300">{diagnostics.isIOS ? 'Apple iOS' : 'Android / Desktop'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Home Screen PWA:</span>
                        <span className={diagnostics.isStandalone ? 'text-emerald-400' : 'text-amber-400'}>
                          {diagnostics.isStandalone ? 'Yes (Standalone)' : 'Browser Tab'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Push Subscription:</span>
                        <span className={diagnostics.activeSubscriptionCount > 0 ? 'text-emerald-400' : 'text-neutral-400'}>
                          {diagnostics.activeSubscriptionCount > 0 ? 'Active' : 'Not Registered'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 text-center space-y-6">
                <div className="flex flex-col items-center gap-2">
                  <img src="/logo.svg" alt="LEAD" className="w-10 h-10 object-contain mb-2" />
                  <h3 className="font-heading font-black text-lg uppercase tracking-wider text-neutral-100">LEAD</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Live Every Ambition Daily</p>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mt-2">
                    LEAD is your relentless personal accountability engine, designed to keep your habits aligned with your goals.
                  </p>
                </div>

                <div className="text-[10px] text-neutral-600 border-t border-neutral-900 pt-4">
                  Version 1.0.0 • Developed by SolveCrew
                </div>

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-6 space-y-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Frequently Asked Questions</p>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-neutral-200">How do reminders work?</h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      LEAD triggers check-in prompts 3 times daily to track if you take actions on your ego goals.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-neutral-200">Are my details secure?</h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Yes. All profile info, streak logs, and tasks are stored locally on your device's browser database.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-neutral-200">What are "Egos"?</h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      An Ego is a specific persona/goal setup that drives your daily ambition. You can edit it anytime.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentScreen('main')} 
                  className="w-full bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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
                <p className="text-xs text-neutral-400 leading-relaxed">
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
                    className="flex-1 bg-neutral-900 text-neutral-300 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-neutral-800 transition-all"
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