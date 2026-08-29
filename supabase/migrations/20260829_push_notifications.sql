-- ----------------------------------------------------
-- PUSH NOTIFICATIONS & CRON SETUP MIGRATION
-- Run this in your Supabase SQL Editor.
-- ----------------------------------------------------

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- 2. Notification Logs Table Updates
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pushed BOOLEAN DEFAULT FALSE NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast cron delivery
CREATE INDEX IF NOT EXISTS idx_notification_logs_cron
  ON public.notification_logs (pushed, scheduled_at)
  WHERE pushed = FALSE;

-- 3. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
  DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
  DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
  DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;

  DROP POLICY IF EXISTS "Users can read own notification logs" ON public.notification_logs;
  DROP POLICY IF EXISTS "Users can insert own notification logs" ON public.notification_logs;
  DROP POLICY IF EXISTS "Users can update own notification logs" ON public.notification_logs;
  DROP POLICY IF EXISTS "Service role can update notification logs" ON public.notification_logs;
END $$;

CREATE POLICY "Users can read own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification logs" ON public.notification_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can update notification logs" ON public.notification_logs
  FOR UPDATE USING (true) WITH CHECK (true);
