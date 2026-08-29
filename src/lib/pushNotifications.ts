import { supabase } from '@/lib/supabase';

// Convert base64 VAPID public key to Uint8Array required by PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushResult {
  success: boolean;
  error?: string;
  message?: string;
  subscription?: PushSubscription;
}

export async function subscribeUserToPush(userId: string): Promise<PushResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot register notifications on server.' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: 'Web Push is not supported in this browser. On iPhone, you MUST tap Share -> "Add to Home Screen" first.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission was denied. Please allow notifications in browser/device settings.',
      };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return {
        success: false,
        error: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured in environment variables.',
      };
    }

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscriptionJson.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'Push subscription payload is missing required keys.' };
    }

    // Save/upsert subscription to Supabase push_subscriptions table
    const { error: dbError } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (dbError) {
      console.error('[Push] Database error saving subscription:', dbError);
      return { success: false, error: `Database error: ${dbError.message}` };
    }

    return {
      success: true,
      message: 'Push notifications enabled successfully!',
      subscription,
    };
  } catch (err: any) {
    console.error('[Push] Error subscribing to push:', err);
    return { success: false, error: err.message || 'Failed to enable push notifications.' };
  }
}

export async function sendTestNotification(userId: string): Promise<PushResult> {
  try {
    const res = await fetch('/api/notifications/send-immediate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: '🔔 Lead App Test Notification',
        body: 'Push notifications are working cleanly on your device!',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to dispatch test notification.' };
    }

    return { success: true, message: 'Test notification sent successfully!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error sending test notification.' };
  }
}

export async function scheduleTestReminder(userId: string, minutesFromNow: number = 1): Promise<PushResult> {
  try {
    const scheduledDate = new Date(Date.now() + minutesFromNow * 60 * 1000);

    const { error } = await supabase.from('notification_logs').insert({
      user_id: userId,
      title: '⏱️ Test Task Reminder',
      scheduled_at: scheduledDate.toISOString(),
      pushed: false,
    });

    if (error) throw error;

    return {
      success: true,
      message: `✓ Test reminder scheduled for ${minutesFromNow} minute(s) from now!`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to schedule test reminder.' };
  }
}

export async function getNotificationDiagnostics(userId: string) {
  if (typeof window === 'undefined') return null;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const permissionState = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;

  let activeSubscriptionCount = 0;
  let dbSubscriptionCount = 0;

  if (userId) {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    dbSubscriptionCount = count || 0;
  }

  if (hasServiceWorker) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    activeSubscriptionCount = sub ? 1 : 0;
  }

  return {
    isIOS,
    isStandalone,
    permissionState,
    hasServiceWorker,
    hasPushManager,
    activeSubscriptionCount,
    dbSubscriptionCount,
  };
}
