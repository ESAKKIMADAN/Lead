-- ----------------------------------------------------
-- LEAD PROJECT DATABASE SCHEMA
-- Run this in your Supabase SQL Editor.
-- ----------------------------------------------------

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  streak INTEGER DEFAULT 0 NOT NULL,
  last_completed_task_date TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Egos Table
CREATE TABLE IF NOT EXISTS public.egos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'mindset'::text NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'short_term' | 'long_term'
  scheduled_time TEXT, -- e.g., "06:00"
  target_date TEXT, -- e.g., "2026-12-31"
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Notification Logs Table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID,
  time_of_day TEXT, -- 'morning' | 'lunch' | 'evening'
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  tone TEXT,
  micro_action TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  opened BOOLEAN DEFAULT FALSE NOT NULL,
  response TEXT -- 'yes' | 'no'
);

-- ----------------------------------------------------
-- Enable Row Level Security (RLS)
-- ----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Egos Policies
CREATE POLICY "Users can read own egos" ON public.egos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own egos" ON public.egos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own egos" ON public.egos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own egos" ON public.egos
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can read own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Notification Logs Policies
CREATE POLICY "Users can read own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification logs" ON public.notification_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'violet',
  pinned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------
-- LEAD PROJECT DATABASE SCHEMA
-- Run this in your Supabase SQL Editor.
-- ----------------------------------------------------

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  streak INTEGER DEFAULT 0 NOT NULL,
  last_completed_task_date TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Egos Table
CREATE TABLE IF NOT EXISTS public.egos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'mindset'::text NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'short_term' | 'long_term'
  scheduled_time TEXT, -- e.g., "06:00"
  target_date TEXT, -- e.g., "2026-12-31"
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Notification Logs Table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID,
  time_of_day TEXT, -- 'morning' | 'lunch' | 'evening'
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  tone TEXT,
  micro_action TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  opened BOOLEAN DEFAULT FALSE NOT NULL,
  response TEXT -- 'yes' | 'no'
);

-- ----------------------------------------------------
-- Enable Row Level Security (RLS)
-- ----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Egos Policies
CREATE POLICY "Users can read own egos" ON public.egos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own egos" ON public.egos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own egos" ON public.egos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own egos" ON public.egos
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can read own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Notification Logs Policies
CREATE POLICY "Users can read own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs" ON public.notification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification logs" ON public.notification_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'violet',
  pinned BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- RPC Functions
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text
  FROM auth.users 
  WHERE raw_user_meta_data->>'display_name' = p_username 
  LIMIT 1;
$$;