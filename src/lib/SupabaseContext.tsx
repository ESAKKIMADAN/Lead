'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { type User, type Session } from '@supabase/supabase-js';

// Types mimicking original Dexie structure
export interface Profile {
  id: string;
  username: string;
  name: string;
  email?: string;
  streak: number;
  last_completed_task_date: string | null;
  timezone: string;
  created_at?: string;
}

export interface Ego {
  id: string;
  user_id: string;
  goal: string;
  reason: string;
  category: 'health' | 'career' | 'relationships' | 'finance' | 'mindset';
  active: boolean;
  psychology_profile?: any;
  tone_effectiveness?: any;
  last_used_tone?: string;
  communication_profile?: {
    directness: number;
    energy: number;
    emotional_support: number;
    detail: number;
    challenge: number;
    humor: number;
  };
  last_used_communication?: {
    directness: number;
    energy: number;
    emotional_support: number;
    detail: number;
    challenge: number;
    humor: number;
  };
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  type: 'short_term' | 'long_term' | 'event' | 'daily';
  scheduled_time?: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  task_id?: string;
  time_of_day: 'morning' | 'lunch' | 'evening';
  notification_title: string;
  notification_body: string;
  tone: string;
  micro_action?: string;
  delivered_at?: string;
  opened: boolean;
  response?: 'yes' | 'no';
}

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  ego: Ego | null;
  egos: Ego[];
  tasks: Task[];
  logs: NotificationLog[];
  notes: Note[];
  loading: boolean;
  authError: string | null;
  signUp: (email: string, name: string, pin: string) => Promise<boolean>;
  signIn: (email: string, pin: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPin: (email: string) => Promise<boolean>;
  updatePin: (newPin: string) => Promise<boolean>;
  getEmailByUsername: (username: string) => Promise<string | null>;
  createInitialData: (name: string, goals: { goal: string; reason: string }[], psychology?: any) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  updateEgo: (id: string, updates: Partial<Ego>) => Promise<void>;
  addEgo: (goal: string, reason: string) => Promise<void>;
  setActiveEgo: (id: string) => Promise<void>;
  addTask: (title: string, type: 'short_term' | 'long_term' | 'event' | 'daily', scheduledTime?: string, targetDate?: string) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addNotificationLog: (log: Omit<NotificationLog, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateNotificationLog: (id: string, response: 'yes' | 'no') => Promise<void>;
  addNote: (title: string, content: string, color: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'pinned'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Helper to pad pin to bypass default 6-character supabase password length requirement
export const padPassword = (pin: string) => {
  return `${pin}_leadapp`;
};

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ego, setEgo] = useState<Ego | null>(null);
  const [egos, setEgos] = useState<Ego[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Read session on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setProfile(null);
        setEgo(null);
        setEgos([]);
        setTasks([]);
        setLogs([]);
        setNotes([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data whenever user session is set
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;
      setProfile(profileData);

      if (profileData) {
        // 2. Fetch Egos
        const { data: egosData, error: egosErr } = await supabase
          .from('egos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (egosErr) throw egosErr;
        setEgos(egosData || []);
        // active ego is either the one marked active, or the most recent one
        const activeEgo = egosData?.find(e => e.active) || egosData?.[0] || null;
        setEgo(activeEgo);

        // 3. Fetch Tasks
        const { data: tasksData, error: tasksErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (tasksErr) throw tasksErr;
        setTasks(tasksData || []);

        // 4. Fetch Logs
        const { data: logsData, error: logsErr } = await supabase
          .from('notification_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('delivered_at', { ascending: false });

        if (logsErr) throw logsErr;
        setLogs(logsData || []);

        // 5. Fetch Notes
        const { data: notesData, error: notesErr } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false });

        if (notesErr && notesErr.code !== 'PGRST116') throw notesErr;
        setNotes(notesData || []);
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (title: string, content: string, color: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: user.id, title, content, color, pinned: false })
        .select()
        .single();
      if (error) throw error;
      setNotes(prev => [data, ...prev]);
    } catch (err: any) {
      console.error('Error adding note:', err.message);
    }
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'pinned'>>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      setNotes(prev => prev.map(n => n.id === id ? data : n)
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
    } catch (err: any) {
      console.error('Error updating note:', err.message);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      console.error('Error deleting note:', err.message);
    }
  };

  const signUp = async (email: string, name: string, pin: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: padPassword(pin),
        options: {
          data: {
            display_name: name,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          setAuthError('This username is already taken. Please choose a different one.');
        } else {
          setAuthError(error.message);
        }
        return false;
      }

      if (!data.user) {
        setAuthError('Failed to sign up.');
        return false;
      }

      return true;
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during signup.');
      return false;
    }
  };

  const signIn = async (email: string, pin: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: padPassword(pin),
      });

      if (error) {
        setAuthError(error.message);
        return false;
      }

      return true;
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during login.');
      return false;
    }
  };

  const getEmailByUsername = async (username: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_email_by_username', { p_username: username });
      if (error) throw error;
      return data || null;
    } catch (err: any) {
      console.error('Error fetching email by username:', err.message);
      return null;
    }
  };

  const resetPin = async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      // Provide a redirectUrl if needed, e.g. window.location.origin + '/reset-pin'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      });
      if (error) {
        setAuthError(error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred.');
      return false;
    }
  };

  const updatePin = async (newPin: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: padPassword(newPin) });
      if (error) {
        setAuthError(error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred.');
      return false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const createInitialData = async (name: string, goals: { goal: string; reason: string }[], psychology?: any) => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create Profile
      const { data: newProfile, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.user_metadata?.display_name || '',
          name: name.trim(),
          email: user.email,
          streak: 0,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .select()
        .single();

      if (profileErr) throw profileErr;
      setProfile(newProfile);

      // 2. Create Egos
      const egosToInsert = goals.map((g, idx) => ({
        user_id: user.id,
        goal: g.goal.trim(),
        reason: g.reason.trim(),
        category: 'mindset',
        psychology_profile: psychology || null,
        tone_effectiveness: { supportive: 50, tough_love: 50, direct: 50, challenge: 50 },
        active: idx === 0,
      }));

      const { data: insertedEgos, error: egosErr } = await supabase
        .from('egos')
        .insert(egosToInsert)
        .select();

      if (egosErr) throw egosErr;
      
      const activeEgo = insertedEgos?.find(e => e.active) || insertedEgos?.[0] || null;
      setEgo(activeEgo);

      // Seed initial tasks
      const initialTasks = [
        { user_id: user.id, title: 'Morning Walk', type: 'short_term', scheduled_time: '06:00', completed: true },
        { user_id: user.id, title: 'Study DSA', type: 'short_term', scheduled_time: '20:00', completed: true },
        { user_id: user.id, title: 'Read 20 Pages', type: 'short_term', completed: false },
      ];

      const { data: insertedTasks, error: tasksErr } = await supabase
        .from('tasks')
        .insert(initialTasks)
        .select();

      if (tasksErr) throw tasksErr;
      setTasks(insertedTasks || []);

    } catch (err: any) {
      console.error('Error creating onboarding data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileName = async (name: string) => {
    if (!user || !profile) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Error updating name:', err.message);
    }
  };

  const updateEgo = async (id: string, updates: Partial<Ego>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('egos')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setEgo(data);
    } catch (err: any) {
      console.error('Error updating ego:', err.message);
    }
  };

  const addEgo = async (goal: string, reason: string) => {
    if (!user) return;
    try {
      await supabase
        .from('egos')
        .update({ active: false })
        .eq('user_id', user.id);

      const { data, error } = await supabase
        .from('egos')
        .insert({
          user_id: user.id,
          goal: goal.trim(),
          reason: reason.trim(),
          category: 'mindset',
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setEgos(prev => [data, ...prev.map(e => ({ ...e, active: false }))]);
      setEgo(data);
    } catch (err: any) {
      console.error('Error adding ego:', err.message);
    }
  };

  const setActiveEgo = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('egos')
        .update({ active: false })
        .eq('user_id', user.id);
      
      const { data, error } = await supabase
        .from('egos')
        .update({ active: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      setEgos(prev => prev.map(e => e.id === id ? data : { ...e, active: false }));
      setEgo(data);
    } catch (err: any) {
      console.error('Error setting active ego:', err.message);
    }
  };

  const addTask = async (title: string, type: 'short_term' | 'long_term' | 'event' | 'daily', scheduledTime?: string, targetDate?: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: title.trim(),
          type,
          scheduled_time: scheduledTime || null,
          target_date: targetDate || null,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      setTasks((prev) => [...prev, data]);
    } catch (err: any) {
      console.error('Error adding task:', err.message);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    try {
      const nextCompleted = !task.completed;
      const { data, error } = await supabase
        .from('tasks')
        .update({
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null,
        })
        .eq('id', task.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));

      // Learning Loop: Update effectiveness of the last used communication profile
      if (nextCompleted && ego) {
        let updates: Partial<Ego> = {};
        
        // Old tone logic
        if (ego.last_used_tone) {
          const currentScores = ego.tone_effectiveness || { supportive: 50, tough_love: 50, direct: 50, challenge: 50 };
          const tone = ego.last_used_tone;
          if (currentScores[tone] !== undefined) {
            const newScore = Math.min(100, currentScores[tone] + 5);
            updates.tone_effectiveness = { ...currentScores, [tone]: newScore };
          }
        }
        
        // New communication profile logic
        if (ego.last_used_communication) {
          const currentProfile = ego.communication_profile || {
            directness: 0.5,
            energy: 0.5,
            emotional_support: 0.5,
            detail: 0.5,
            challenge: 0.5,
            humor: 0.5
          };
          
          const shiftRate = 0.2; // Move 20% towards the effective communication dimensions
          
          const newProfile = {
            directness: currentProfile.directness * (1 - shiftRate) + ego.last_used_communication.directness * shiftRate,
            energy: currentProfile.energy * (1 - shiftRate) + ego.last_used_communication.energy * shiftRate,
            emotional_support: currentProfile.emotional_support * (1 - shiftRate) + ego.last_used_communication.emotional_support * shiftRate,
            detail: currentProfile.detail * (1 - shiftRate) + ego.last_used_communication.detail * shiftRate,
            challenge: currentProfile.challenge * (1 - shiftRate) + ego.last_used_communication.challenge * shiftRate,
            humor: currentProfile.humor * (1 - shiftRate) + ego.last_used_communication.humor * shiftRate,
          };
          
          updates.communication_profile = newProfile;
        }

        if (Object.keys(updates).length > 0) {
          await updateEgo(ego.id, updates);
        }
      }
    } catch (err: any) {
      console.error('Error toggling task:', err.message);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting task:', err.message);
    }
  };

  const addNotificationLog = async (log: Omit<NotificationLog, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .insert({
          user_id: user.id,
          task_id: log.task_id || null,
          time_of_day: log.time_of_day,
          notification_title: log.notification_title,
          notification_body: log.notification_body,
          tone: log.tone,
          micro_action: log.micro_action || null,
          delivered_at: log.delivered_at || new Date().toISOString(),
          opened: log.opened,
          response: log.response || null,
        })
        .select()
        .single();

      if (error) throw error;
      setLogs((prev) => [data, ...prev]);
    } catch (err: any) {
      console.error('Error adding notification log:', err.message);
    }
  };

  const updateNotificationLog = async (id: string, response: 'yes' | 'no') => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .update({ response })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setLogs((prev) => prev.map((l) => (l.id === id ? data : l)));
    } catch (err: any) {
      console.error('Error updating notification log:', err.message);
    }
  };

  const resetAllData = async () => {
    if (!user) return;
    try {
      // Cascade delete on profiles will delete egos, tasks, and logs.
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;
      setProfile(null);
      setEgo(null);
      setEgos([]);
      setTasks([]);
      setLogs([]);
      setNotes([]);
    } catch (err: any) {
      console.error('Error resetting data:', err.message);
    }
  };

  return (
    <SupabaseContext.Provider
      value={{
        user,
        session,
        profile,
        ego,
        egos,
        tasks,
        logs,
        notes,
        loading,
        authError,
        signUp,
        signIn,
        signOut,
        resetPin,
        updatePin,
        getEmailByUsername,
        createInitialData,
        updateProfileName,
        updateEgo,
        addEgo,
        setActiveEgo,
        addTask,
        toggleTask,
        deleteTask,
        addNotificationLog,
        updateNotificationLog,
        addNote,
        updateNote,
        deleteNote,
        resetAllData,
        refreshData: fetchUserData,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
