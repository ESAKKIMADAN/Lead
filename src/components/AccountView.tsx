'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChevronRight, LogOut, Trash2, User, Bell, Moon, Target, ChevronLeft, Check, Download, Smartphone } from 'lucide-react';


type ScreenState = 'main' | 'profile' | 'ego' | 'notifications' | 'pin' | 'about' | 'faq' | 'deactivate';

interface AccountViewProps {
  onBack?: () => void;
}

export default function AccountView({ onBack }: AccountViewProps) {
  const { profile, ego, egos, setActiveEgo, logs, updateProfileName, updateEgo, updatePin, resetAllData, signOut, authError, addEgo, savePushSubscription } = useSupabase();

  
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);

  const [isNewGoal, setIsNewGoal] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  const [permissionState, setPermissionState] = useState<string>('default');
  const [swStatus, setSwStatus] = useState<string>('Checking...');
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [subStatus, setSubStatus] = useState<string>('Checking...');
  const [testStatus, setTestStatus] = useState<string>('None');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPermissionState(Notification.permission);
      navigator.serviceWorker.ready.then(reg => {
        setSwStatus('Registered');
        reg.pushManager.getSubscription().then(sub => {
          setSubStatus(sub ? 'Active' : 'Missing');
        });
      }).catch(err => {
        setSwStatus('Failed: ' + err.message);
      });
    } else {
      setPushSupported(false);
      setSwStatus('Unsupported');
      setSubStatus('Unsupported');
    }
  }, []);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications not supported by this browser.');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        alert('Permission denied.');
        return;
      }
      
      const reg = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert('VAPID Key not found.');
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      await savePushSubscription(subscription);
      setSubStatus('Active');
      alert('Successfully subscribed to push notifications!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to subscribe: ' + err.message);
    }
  };

  const handleTestPush = async () => {
    setTestStatus('Sending...');
    try {
      const sessionModule = await import('@/lib/supabase');
      const sessionData = await sessionModule.supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;

      // Call our Next.js notification API route
      let res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: '🔔 LEAD Notification',
          body: 'Push notifications are working correctly.'
        })
      });

      // Fallback to Supabase edge function if local route failed
      if (!res.ok && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-immediate-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: '🔔 LEAD Notification',
              body: 'Push notifications are working correctly.'
            })
          });
        } catch {}
      }

      const data = await res.json().catch(() => ({}));
      if (data.success || res.ok) {
        setTestStatus('Success');
        // If permission is already granted, also trigger a local browser notification for instant visual feedback
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('🔔 LEAD Notification', {
            body: 'Push notifications are working correctly.',
            icon: '/logo.png',
          });
        }
      } else {
        setTestStatus('Failed: ' + (data.error || 'Request failed'));
      }
    } catch (err: any) {
      setTestStatus('Failed: ' + err.message);
    }
  };

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
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

  useEffect(() => {
    if (profile) setEditName(profile.name);
    if (ego && !isNewGoal) {
      setEditGoal(ego.goal);
      setEditReason(ego.reason);
    }
  }, [profile, ego, isNewGoal]);


  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-white rounded-full animate-spin" />
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
    if (isNewGoal) {
      await addEgo(editGoal.trim(), editReason.trim());
      setIsNewGoal(false);
    } else {
      await updateEgo(ego.id, {
        goal: editGoal.trim() || ego.goal,
        reason: editReason.trim() || ego.reason,
      });
    }
    setSaving(false);
    setCurrentScreen('main');
  };

  const handleUpdatePin = async () => {
    if (!/^\d{4}$/.test(newPin)) return;
    setSaving(true);
    const success = await updatePin(newPin);
    setSaving(false);
    if (success) {
      setCurrentScreen('main');
      setNewPin('');
    }
  };

  const handleReset = async () => {
    setSaving(true);
    await resetAllData();
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-48 pt-[calc(env(safe-area-inset-top,0px)+3rem)] sm:pt-16 select-none font-sans">
      <div className="max-w-md lg:max-w-3xl mx-auto px-6 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start">
          <h1 className="text-5xl font-medium leading-[1.1] tracking-tight text-foreground">
            My<br/>Settings
          </h1>
          <button
            onClick={() => {
              if (currentScreen === 'main') {
                if (onBack) onBack();
              } else {
                setCurrentScreen('main');
              }
            }}
            className="w-12 h-12 rounded-full bg-black/10 dark:bg-white/10 text-foreground flex items-center justify-center hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 transition-all shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* ── MAIN SETTINGS BODY ── */}
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
              {/* Profile Card */}
              <div 
                onClick={() => setCurrentScreen('profile')}
                className="flex items-center justify-between p-6 bg-card-purple border border-black/5 dark:border-white/5 rounded-[40px] cursor-pointer active:scale-95 transition-all shadow-sm text-black"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center text-black">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl leading-tight">{profile.name}</h3>
                    <p className="text-sm text-black/60 mt-1 truncate max-w-[200px] font-medium">
                      {ego.goal}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 opacity-40" />
              </div>

              {/* Preferences Section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest pl-2">Preferences</p>
                
                <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden shadow-sm">
                  
                  {/* Goal Setup */}
                  <div 
                    onClick={() => setCurrentScreen('ego')}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center text-foreground">
                      <span className="text-lg font-medium">Goal Setup</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black/30 dark:text-white/30" />
                  </div>

                  {/* Notifications */}
                  <div 
                    onClick={() => setCurrentScreen('notifications')}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center text-foreground">
                      <span className="text-lg font-medium">Notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {notifPermission === 'granted' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black bg-card-mint px-3 py-1 rounded-full">Active</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-black/30 dark:text-white/30" />
                    </div>
                  </div>

                  {/* Change PIN */}
                  <div 
                    onClick={() => {
                      setNewPin('');
                      setCurrentScreen('pin');
                    }}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center text-foreground">
                      <span className="text-lg font-medium">Change PIN</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black/30 dark:text-white/30" />
                  </div>

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between px-6 py-5">
                    <div className="flex items-center text-foreground">
                      <span className="text-lg font-medium">Dark Mode</span>
                    </div>
                    <div 
                      onClick={toggleTheme}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer flex items-center transition-colors ${
                        isDarkMode ? 'bg-card-orange justify-end' : 'bg-black/10 dark:bg-white/10 justify-start'
                      }`}
                    >
                      <motion.div 
                        layout 
                        className={`w-6 h-6 rounded-full shadow-sm ${isDarkMode ? 'bg-black' : 'bg-black/50 dark:bg-white/50'}`}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden shadow-sm">
                <div 
                  onClick={signOut}
                  className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5"
                >
                  <div className="flex items-center text-foreground">
                    <span className="text-lg font-medium text-black/80 dark:text-white/80">Sign Out</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-black/30 dark:text-white/30" />
                </div>

                <div 
                  onClick={() => setCurrentScreen('deactivate')}
                  className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-red-500/10 transition-colors text-red-500"
                >
                  <div className="flex items-center">
                    <span className="text-lg font-medium">Reset Account</span>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-40" />
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN: CHANGE PIN */}
          {currentScreen === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <p className="text-sm font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest pl-2">Update PIN</p>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider pl-2 block">New 4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/5 dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 text-foreground rounded-3xl px-6 py-4 outline-none focus:border-black/20 dark:border-white/20 transition-colors text-center tracking-[1em] font-mono text-xl"
                    placeholder="••••"
                  />
                </div>

                {authError && (
                  <div className="text-sm text-red-500 text-center">{authError}</div>
                )}
              </div>
              
              <button
                onClick={handleUpdatePin}
                disabled={saving || !/^\d{4}$/.test(newPin)}
                className="w-full bg-foreground text-background py-4 rounded-full font-bold tracking-wide hover:bg-neutral-200 active:scale-[0.98] transition-all flex justify-center disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Update PIN'
                )}
              </button>
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
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <p className="text-sm font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest pl-2">Edit Profile</p>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider pl-2 block">Your Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground rounded-3xl px-5 py-4 outline-none focus:border-black/30 dark:border-white/30 transition-colors text-lg font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveProfileName} 
                    disabled={saving || !editName.trim()} 
                    className="flex-1 bg-foreground text-background py-4 rounded-3xl font-semibold text-lg hover:brightness-90 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-black/10 dark:bg-white/10 text-foreground py-4 rounded-3xl font-semibold text-lg hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 transition-all"
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
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between pl-2">
                  <p className="text-sm font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest">{isNewGoal ? 'New Goal' : 'Your Goals'}</p>
                  {!isNewGoal && (
                    <button 
                      onClick={() => {
                        setIsNewGoal(true);
                        setEditGoal('');
                        setEditReason('');
                      }} 
                      className="text-xs font-semibold bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 text-foreground px-3 py-1.5 rounded-full transition-colors"
                    >
                      + Add New Goal
                    </button>
                  )}
                </div>

                {!isNewGoal ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {egos.map(e => (
                      <div 
                        key={e.id}
                        onClick={() => {
                           if (!e.active) setActiveEgo(e.id);
                        }}
                        className={`p-5 rounded-3xl border transition-all ${
                          e.active 
                            ? 'bg-card-purple border-black/10 dark:border-black/10 text-black shadow-sm' 
                            : 'bg-black/5 dark:bg-white/5 border-transparent text-foreground hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                           <p className="font-semibold text-[15px] leading-snug">{e.goal}</p>
                           {e.active && <span className="text-[9px] uppercase font-bold bg-white/50 text-black px-2 py-1 rounded-full whitespace-nowrap">Active</span>}
                        </div>
                        <p className="text-xs mt-2 opacity-60 leading-relaxed line-clamp-2">{e.reason}</p>
                      </div>
                    ))}
                    {egos.length === 0 && (
                      <p className="text-center text-sm text-neutral-500 py-4">No goals found.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider pl-2 block mb-2">Goal Description</label>
                      <textarea
                        value={editGoal}
                        onChange={(e) => setEditGoal(e.target.value)}
                        rows={3}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground rounded-3xl px-5 py-4 outline-none focus:border-black/30 dark:border-white/30 resize-none transition-colors text-lg font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-wider pl-2 block mb-2">Why it matters</label>
                      <textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        rows={3}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-foreground rounded-3xl px-5 py-4 outline-none focus:border-black/30 dark:border-white/30 resize-none transition-colors text-lg font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {isNewGoal ? (
                    <>
                      <button 
                        onClick={handleSaveEgo} 
                        disabled={saving} 
                        className="flex-1 bg-foreground text-background py-4 rounded-3xl font-semibold text-lg hover:brightness-90 transition-all disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        onClick={() => {
                          setIsNewGoal(false);
                          setCurrentScreen('main');
                        }} 
                        className="flex-1 bg-black/10 dark:bg-white/10 text-foreground py-4 rounded-3xl font-semibold text-lg hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setCurrentScreen('main')} 
                      className="w-full bg-black/10 dark:bg-white/10 text-foreground py-4 rounded-3xl font-semibold text-lg hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 transition-all"
                    >
                      Back
                    </button>
                  )}
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
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[40px] p-6 space-y-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest pl-2">Push Notifications</p>
                </div>

                <div className="flex flex-col gap-4 w-full">
                  <p className="text-sm text-foreground/70 px-2 leading-relaxed">
                    Enable push notifications to receive real-time updates and scheduled accountability check-ins directly on this device.
                  </p>
                  
                  <button
                    onClick={handleSubscribe}
                    className="bg-card-orange text-black px-6 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest w-full flex items-center justify-center gap-2 hover:brightness-95 transition-all active:scale-95 shadow-md"
                  >
                    <Bell className="w-5 h-5 stroke-[2.5]" />
                    Enable Notifications
                  </button>
                </div>

              </div>

              {/* Diagnostics Area */}
              <div className="bg-white dark:bg-[#151515] border border-black/5 dark:border-white/5 rounded-[40px] p-6 space-y-4 shadow-sm">
                 <p className="text-sm font-semibold text-black/40 dark:text-white/40 uppercase tracking-widest pl-2">Diagnostics</p>
                 <div className="text-xs text-foreground/70 space-y-2 px-2 font-mono">
                    <p>Push API: {pushSupported ? 'Supported' : 'Unsupported'}</p>
                    <p>Permission: {permissionState}</p>
                    <p>Service Worker: {swStatus}</p>
                    <p>Subscription: {subStatus}</p>
                    <p>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                    <p>Test Status: {testStatus}</p>
                 </div>
                 
                 <button
                    onClick={handleTestPush}
                    disabled={subStatus !== 'Active'}
                    className="mt-4 bg-black/10 dark:bg-white/10 text-foreground px-6 py-3 rounded-3xl font-bold text-xs uppercase tracking-widest w-full hover:bg-black/20 dark:hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    Send Test Notification
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
              <div className="bg-white dark:bg-[#151515] border border-red-500/20 rounded-[40px] p-6 space-y-6 text-center shadow-sm">
                <p className="text-sm font-semibold text-red-500/80 uppercase tracking-widest">Danger Zone</p>
                <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed max-w-[280px] mx-auto">
                  Are you sure? This will permanently erase your profile, active goals, streaks, and all tasks.
                </p>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleReset} 
                    className="flex-1 bg-red-500 text-foreground py-4 rounded-3xl font-semibold text-lg hover:bg-red-600 transition-all"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-black/10 dark:bg-white/10 text-foreground py-4 rounded-3xl font-semibold text-lg hover:bg-black/20 dark:hover:bg-black/20 dark:bg-white/20 transition-all"
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
