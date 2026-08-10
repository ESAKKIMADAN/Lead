'use client';

import { useSupabase } from '@/lib/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChevronRight, LogOut, Trash2, User, Bell, Moon, Target, ChevronLeft, Check } from 'lucide-react';

type ScreenState = 'main' | 'profile' | 'ego' | 'notifications' | 'pin' | 'about' | 'faq' | 'deactivate';

interface AccountViewProps {
  onBack?: () => void;
}

export default function AccountView({ onBack }: AccountViewProps) {
  const { profile, ego, updateProfileName, updateEgo, updatePin, resetAllData, signOut, authError } = useSupabase();
  
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editReason, setEditReason] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'success' | 'error' | 'no_sub'>('idle');
  const [pushMessage, setPushMessage] = useState('');

  const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    hasNotificationSupport ? Notification.permission : 'unsupported'
  );

  const [isDarkMode, setIsDarkMode] = useState(true);

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

  useEffect(() => {
    if (profile) setEditName(profile.name);
    if (ego) {
      setEditGoal(ego.goal);
      setEditReason(ego.reason);
    }
  }, [profile, ego]);

  if (!profile || !ego) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestNotificationPermission = async () => {
    if (!hasNotificationSupport) {
      setPushStatus('error');
      setPushMessage('This browser does not support notifications.');
      return;
    }

    setEnablingPush(true);
    setPushStatus('idle');
    setPushMessage('');

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);

      if (result === 'denied') {
        setPushStatus('error');
        setPushMessage('Permission denied. Go to browser Settings → Notifications → Allow for this site.');
        return;
      }

      if (result !== 'granted') return;

      if (!('serviceWorker' in navigator)) {
        setPushStatus('error');
        setPushMessage('Service workers not supported in this browser.');
        return;
      }

      // Fetch VAPID key from server at runtime (no rebuild needed)
      let vapidPublicKey: string;
      try {
        const keyRes = await fetch('/api/push/vapid-key');
        if (!keyRes.ok) throw new Error('VAPID key endpoint returned ' + keyRes.status);
        const keyData = await keyRes.json();
        vapidPublicKey = keyData.publicKey;
        if (!vapidPublicKey) throw new Error('Empty VAPID key from server');
      } catch (keyErr: any) {
        setPushStatus('error');
        setPushMessage('Push not configured on server. Add VAPID keys to Vercel env vars.');
        return;
      }

      // Get or register SW with timeout (ready can hang if SW is stuck updating)
      let registration: ServiceWorkerRegistration;
      try {
        // Register if needed
        const existing = await navigator.serviceWorker.getRegistration('/');
        if (!existing) {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }

        // Force any waiting SW to activate immediately
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Wait for ready with 8s timeout
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Service worker timed out. Try refreshing the page and retry.')), 8000)
          ),
        ]);
      } catch (swErr: any) {
        setPushStatus('error');
        setPushMessage('SW error: ' + swErr.message);
        return;
      }

      // ── KEY FIX: unsubscribe old subscription first ──────────────────────
      // Without this, resubscribing with new VAPID keys throws
      // "The application server key did not match" and loops forever.
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          console.log('[Push] Old subscription removed.');
        }
      } catch (unsubErr) {
        console.warn('[Push] Could not unsubscribe old sub:', unsubErr);
        // Non-fatal — continue anyway
      }

      // Subscribe fresh with current VAPID key
      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subErr: any) {
        setPushStatus('error');
        setPushMessage('Subscribe failed: ' + subErr.message);
        return;
      }

      const subJSON = subscription.toJSON();

      // Save via server API (uses service_role — bypasses RLS completely)
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setPushStatus('error');
        setPushMessage('Failed to save subscription: ' + (errData.error || res.status));
        return;
      }

      setPushStatus('success');
      setPushMessage('Device registered! Tap Send Test Push to verify.');
      console.log('[Push] Subscription saved.');
    } catch (error: any) {
      console.error('[Push] Unexpected error:', error);
      setPushStatus('error');
      setPushMessage('Error: ' + (error?.message || 'unknown'));
    } finally {
      setEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setSaving(true);
    setPushStatus('idle');
    setPushMessage('');
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          test: true, // server will pick a random notification_log
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPushStatus(res.status === 404 ? 'no_sub' : 'error');
        setPushMessage(data.message || data.error || 'Push failed');
      } else {
        setPushStatus('success');
        setPushMessage('Notification sent! Check your alerts.');
      }
    } catch (err: any) {
      console.error('Test push error:', err);
      setPushStatus('error');
      setPushMessage('Network error. Try again.');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await resetAllData();
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 pt-12 select-none font-sans">
      <div className="max-w-md mx-auto px-6 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start">
          <h1 className="text-5xl font-medium leading-[1.1] tracking-tight text-white">
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
            className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-sm"
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
                className="flex items-center justify-between p-6 bg-card-purple border border-white/5 rounded-[40px] cursor-pointer active:scale-95 transition-all shadow-sm text-black"
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
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest pl-2">Preferences</p>
                
                <div className="bg-[#151515] border border-white/5 rounded-[32px] overflow-hidden shadow-sm">
                  
                  {/* Goal Setup */}
                  <div 
                    onClick={() => setCurrentScreen('ego')}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <div className="flex items-center gap-4 text-white">
                      <Target className="w-5 h-5 opacity-60" />
                      <span className="text-lg font-medium">Goal Setup</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>

                  {/* Notifications */}
                  <div 
                    onClick={() => setCurrentScreen('notifications')}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <div className="flex items-center gap-4 text-white">
                      <Bell className="w-5 h-5 opacity-60" />
                      <span className="text-lg font-medium">Notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {permissionState === 'granted' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black bg-card-mint px-3 py-1 rounded-full">Active</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </div>
                  </div>

                  {/* Change PIN */}
                  <div 
                    onClick={() => {
                      setNewPin('');
                      setCurrentScreen('pin');
                    }}
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <div className="flex items-center gap-4 text-white">
                      <User className="w-5 h-5 opacity-60" />
                      <span className="text-lg font-medium">Change PIN</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/30" />
                  </div>

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-4 text-white">
                      <Moon className="w-5 h-5 opacity-60" />
                      <span className="text-lg font-medium">Dark Mode</span>
                    </div>
                    <div 
                      onClick={toggleTheme}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer flex items-center transition-colors ${
                        isDarkMode ? 'bg-card-orange justify-end' : 'bg-white/10 justify-start'
                      }`}
                    >
                      <motion.div 
                        layout 
                        className={`w-6 h-6 rounded-full shadow-sm ${isDarkMode ? 'bg-black' : 'bg-white/50'}`}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#151515] border border-white/5 rounded-[32px] overflow-hidden shadow-sm">
                <div 
                  onClick={signOut}
                  className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <div className="flex items-center gap-4 text-white">
                    <LogOut className="w-5 h-5 opacity-60" />
                    <span className="text-lg font-medium text-white/80">Sign Out</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>

                <div 
                  onClick={() => setCurrentScreen('deactivate')}
                  className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-red-500/10 transition-colors text-red-500"
                >
                  <div className="flex items-center gap-4">
                    <Trash2 className="w-5 h-5 opacity-80" />
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
              <div className="bg-[#151515] border border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <p className="text-sm font-semibold text-white/40 uppercase tracking-widest pl-2">Update PIN</p>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-2 block">New 4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-3xl px-6 py-4 outline-none focus:border-white/20 transition-colors text-center tracking-[1em] font-mono text-xl"
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
                className="w-full bg-white text-black py-4 rounded-full font-bold tracking-wide hover:bg-neutral-200 active:scale-[0.98] transition-all flex justify-center disabled:opacity-50"
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
              <div className="bg-[#151515] border border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <p className="text-sm font-semibold text-white/40 uppercase tracking-widest pl-2">Edit Profile</p>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-2 block">Your Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-3xl px-5 py-4 outline-none focus:border-white/30 transition-colors text-lg font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveProfileName} 
                    disabled={saving || !editName.trim()} 
                    className="flex-1 bg-white text-black py-4 rounded-3xl font-semibold text-lg hover:brightness-90 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-white/10 text-white py-4 rounded-3xl font-semibold text-lg hover:bg-white/20 transition-all"
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
              <div className="bg-[#151515] border border-white/5 rounded-[40px] p-6 space-y-6 shadow-sm">
                <p className="text-sm font-semibold text-white/40 uppercase tracking-widest pl-2">Goal Setup</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-2 block mb-2">Goal Description</label>
                    <textarea
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-3xl px-5 py-4 outline-none focus:border-white/30 resize-none transition-colors text-lg font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider pl-2 block mb-2">Why it matters</label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-3xl px-5 py-4 outline-none focus:border-white/30 resize-none transition-colors text-lg font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSaveEgo} 
                    disabled={saving} 
                    className="flex-1 bg-white text-black py-4 rounded-3xl font-semibold text-lg hover:brightness-90 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-white/10 text-white py-4 rounded-3xl font-semibold text-lg hover:bg-white/20 transition-all"
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
              <div className="bg-[#151515] border border-white/5 rounded-[40px] p-6 space-y-5 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-white/40 uppercase tracking-widest pl-2">Push Notifications</p>
                </div>

                {/* ── Debug Info ── */}
                <div className="bg-white/5 rounded-2xl p-4 text-xs space-y-1 font-mono text-left">
                  <p className="text-white/40 font-bold uppercase tracking-widest mb-2 text-[10px]">Browser Support</p>
                  <p className={typeof window !== 'undefined' && 'Notification' in window ? 'text-green-400' : 'text-red-400'}>
                    {typeof window !== 'undefined' && 'Notification' in window ? '✓' : '✗'} Notification API
                  </p>
                  <p className={typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'text-green-400' : 'text-red-400'}>
                    {typeof window !== 'undefined' && 'serviceWorker' in navigator ? '✓' : '✗'} Service Worker
                  </p>
                  <p className={typeof window !== 'undefined' && 'PushManager' in window ? 'text-green-400' : 'text-red-400'}>
                    {typeof window !== 'undefined' && 'PushManager' in window ? '✓' : '✗'} PushManager
                  </p>
                  <p className="text-white/60">
                    Permission: <span className={permissionState === 'granted' ? 'text-green-400' : permissionState === 'denied' ? 'text-red-400' : 'text-yellow-400'}>{permissionState}</span>
                  </p>
                </div>

                {/* ── Action Area ── */}
                <div className="flex flex-col gap-3 w-full">
                  {permissionState === 'denied' ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
                      ✗ Notifications blocked in browser.<br/>
                      <span className="text-xs text-red-300">Go to browser Settings → Site Settings → Notifications → Allow</span>
                    </div>
                  ) : (
                    <button
                      onClick={requestNotificationPermission}
                      disabled={enablingPush}
                      className="bg-card-orange text-black px-6 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest w-full flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                    >
                      {enablingPush ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Enabling...
                        </>
                      ) : permissionState === 'granted' ? (
                        'Re-register This Device'
                      ) : (
                        'Enable Push Alerts'
                      )}
                    </button>
                  )}

                  {/* Status messages */}
                  {pushStatus === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 text-green-400 text-sm">
                      ✓ {pushMessage}
                    </div>
                  )}
                  {pushStatus === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm text-left">
                      ✗ {pushMessage}
                    </div>
                  )}

                  {/* Test push (only when registered) */}
                  {pushStatus === 'success' && (
                    <button
                      onClick={handleTestPush}
                      disabled={saving}
                      className="bg-white/10 text-white px-6 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest w-full hover:bg-white/20 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {saving ? 'Sending...' : 'Send Test Push'}
                    </button>
                  )}

                  {/* Always show test push if already active */}
                  {pushStatus !== 'success' && permissionState === 'granted' && (
                    <button
                      onClick={handleTestPush}
                      disabled={saving}
                      className="bg-white/10 text-white px-6 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest w-full hover:bg-white/20 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {saving ? 'Sending...' : 'Send Test Push'}
                    </button>
                  )}
                </div>
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
              <div className="bg-[#151515] border border-red-500/20 rounded-[40px] p-6 space-y-6 text-center shadow-sm">
                <p className="text-sm font-semibold text-red-500/80 uppercase tracking-widest">Danger Zone</p>
                <p className="text-sm text-white/70 leading-relaxed max-w-[280px] mx-auto">
                  Are you sure? This will permanently erase your profile, active goals, streaks, and all tasks.
                </p>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleReset} 
                    className="flex-1 bg-red-500 text-white py-4 rounded-3xl font-semibold text-lg hover:bg-red-600 transition-all"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('main')} 
                    className="flex-1 bg-white/10 text-white py-4 rounded-3xl font-semibold text-lg hover:bg-white/20 transition-all"
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
