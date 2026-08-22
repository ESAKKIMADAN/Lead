'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { type User, type Session } from '@supabase/supabase-js';
import { offlineDb } from './offlineDb';

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
  isOnline: boolean;
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
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  // ── OFFLINE / ONLINE ──────────────────────────────────────────────────────
  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // OFFLINE: Serve from Dexie cache
      if (!navigator.onLine) {
        const profileData = await offlineDb.profiles.get(user.id) ?? null;
        setProfile(profileData);
        if (profileData) {
          const egosData = await offlineDb.egos.where('user_id').equals(user.id).toArray();
          egosData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setEgos(egosData);
          setEgo(egosData.find(e => e.active) || egosData[0] || null);

          const tasksData = await offlineDb.tasks.where('user_id').equals(user.id).toArray();
          tasksData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setTasks(tasksData);

          const notesData = await offlineDb.notes.where('user_id').equals(user.id).toArray();
          notesData.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          setNotes(notesData);
        }
        return;
      }

      // ONLINE: Fetch from Supabase and write-through cache to Dexie
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr) throw profileErr;
      setProfile(profileData);
      if (profileData) await offlineDb.profiles.put(profileData);

      if (profileData) {
        // Egos
        const { data: egosData, error: egosErr } = await supabase
          .from('egos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (egosErr) throw egosErr;
        setEgos(egosData || []);
        if (egosData && egosData.length > 0) {
          // Clear stale egos for this user then re-insert fresh ones
          await offlineDb.egos.where('user_id').equals(user.id).delete();
          await offlineDb.egos.bulkPut(egosData);
        }
        const activeEgo = egosData?.find(e => e.active) || egosData?.[0] || null;
        setEgo(activeEgo);

        // Tasks
        const { data: tasksData, error: tasksErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (tasksErr) throw tasksErr;
        setTasks(tasksData || []);
        if (tasksData && tasksData.length > 0) {
          await offlineDb.tasks.where('user_id').equals(user.id).delete();
          await offlineDb.tasks.bulkPut(tasksData);
        }

        // Logs (not cached offline — not critical)
        const { data: logsData, error: logsErr } = await supabase
          .from('notification_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('delivered_at', { ascending: false });

        if (logsErr) throw logsErr;
        setLogs(logsData || []);

        // Notes
        const { data: notesData, error: notesErr } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('pinned', { ascending: false })
          .order('updated_at', { ascending: false });

        if (notesErr && notesErr.code !== 'PGRST116') throw notesErr;
        setNotes(notesData || []);
        if (notesData && notesData.length > 0) {
          await offlineDb.notes.where('user_id').equals(user.id).delete();
          await offlineDb.notes.bulkPut(notesData);
        }
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Replay all queued offline mutations to Supabase, then refresh
  const syncPendingOps = async () => {
    if (!user) return;
    const ops = await offlineDb.pendingOps.orderBy('created_at').toArray();
    if (ops.length === 0) return;

    for (const op of ops) {
      try {
        if (op.table === 'tasks') {
          if (op.operation === 'insert') {
            await supabase.from('tasks').insert(op.payload);
          } else if (op.operation === 'update') {
            await supabase.from('tasks').update(op.payload.updates)
              .eq('id', op.payload.id).eq('user_id', user.id);
          } else if (op.operation === 'delete') {
            await supabase.from('tasks').delete()
              .eq('id', op.payload.id).eq('user_id', user.id);
          }
        } else if (op.table === 'notes') {
          if (op.operation === 'insert') {
            await supabase.from('notes').insert(op.payload);
          } else if (op.operation === 'update') {
            await supabase.from('notes').update(op.payload.updates)
              .eq('id', op.payload.id).eq('user_id', user.id);
          } else if (op.operation === 'delete') {
            await supabase.from('notes').delete()
              .eq('id', op.payload.id).eq('user_id', user.id);
          }
        }
        if (op.id !== undefined) {
          await offlineDb.pendingOps.delete(op.id);
        }
      } catch (err: any) {
        console.error('Error syncing pending op:', op, err.message);
      }
    }
    // Re-fetch from Supabase to get real IDs and fresh data
    await fetchUserData();
  };

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOps();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]); // re-register when user changes so syncPendingOps closure is fresh

  // ── NOTES ────────────────────────────────────────────────────────────────
  const addNote = async (title: string, content: string, color: string) => {
    if (!user) return;
    const payload = { user_id: user.id, title, content, color, pinned: false };

    if (!navigator.onLine) {
      const tempNote: Note = {
        ...payload,
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await offlineDb.notes.put(tempNote);
      await offlineDb.pendingOps.add({
        table: 'notes', operation: 'insert', payload,
        created_at: new Date().toISOString(),
      });
      setNotes(prev => [tempNote, ...prev]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await offlineDb.notes.put(data);
      setNotes(prev => [data, ...prev]);
    } catch (err: any) {
      console.error('Error adding note:', err.message);
    }
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'pinned'>>) => {
    if (!user) return;

    if (!navigator.onLine) {
      const existing = await offlineDb.notes.get(id);
      if (existing) {
        const updated: Note = { ...existing, ...updates, updated_at: new Date().toISOString() };
        await offlineDb.notes.put(updated);
        setNotes(prev =>
          prev.map(n => n.id === id ? updated : n)
            .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
        );
      }
      await offlineDb.pendingOps.add({
        table: 'notes', operation: 'update',
        payload: { id, updates: { ...updates, updated_at: new Date().toISOString() } },
        created_at: new Date().toISOString(),
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      await offlineDb.notes.put(data);
      setNotes(prev => prev.map(n => n.id === id ? data : n)
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
    } catch (err: any) {
      console.error('Error updating note:', err.message);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    if (!navigator.onLine) {
      await offlineDb.notes.delete(id);
      await offlineDb.pendingOps.add({
        table: 'notes', operation: 'delete', payload: { id },
        created_at: new Date().toISOString(),
      });
      setNotes(prev => prev.filter(n => n.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      await offlineDb.notes.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      console.error('Error deleting note:', err.message);
    }
  };

  // ── AUTH ─────────────────────────────────────────────────────────────────
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

  // ── ONBOARDING ───────────────────────────────────────────────────────────
  const createInitialData = async (name: string, goals: { goal: string; reason: string }[], psychology?: any) => {
    if (!user) return;
    setLoading(true);

    try {
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
      await offlineDb.profiles.put(newProfile);

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
      if (insertedEgos && insertedEgos.length > 0) {
        await offlineDb.egos.bulkPut(insertedEgos);
      }

      const activeEgo = insertedEgos?.find(e => e.active) || insertedEgos?.[0] || null;
      setEgo(activeEgo);

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
      if (insertedTasks && insertedTasks.length > 0) {
        await offlineDb.tasks.bulkPut(insertedTasks);
      }

    } catch (err: any) {
      console.error('Error creating onboarding data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── PROFILE ──────────────────────────────────────────────────────────────
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
      await offlineDb.profiles.put(data);
    } catch (err: any) {
      console.error('Error updating name:', err.message);
    }
  };

  // ── EGOS ─────────────────────────────────────────────────────────────────
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
      await offlineDb.egos.put(data);
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
      await offlineDb.egos.put(data);
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
      await offlineDb.egos.put(data);
      setEgos(prev => prev.map(e => e.id === id ? data : { ...e, active: false }));
      setEgo(data);
    } catch (err: any) {
      console.error('Error setting active ego:', err.message);
    }
  };

  // ── TASKS ────────────────────────────────────────────────────────────────
  const addTask = async (
    title: string,
    type: 'short_term' | 'long_term' | 'event' | 'daily',
    scheduledTime?: string,
    targetDate?: string,
  ) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      title: title.trim(),
      type,
      scheduled_time: scheduledTime || null,
      target_date: targetDate || null,
      completed: false,
    };

    if (!navigator.onLine) {
      const tempTask: Task = {
        ...payload,
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      await offlineDb.tasks.put(tempTask);
      await offlineDb.pendingOps.add({
        table: 'tasks', operation: 'insert', payload,
        created_at: new Date().toISOString(),
      });
      setTasks(prev => [...prev, tempTask]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      await offlineDb.tasks.put(data);
      setTasks(prev => [...prev, data]);
    } catch (err: any) {
      console.error('Error adding task:', err.message);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!user) return;
    const nextCompleted = !task.completed;
    const updates = {
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
    };

    if (!navigator.onLine) {
      const updatedTask: Task = { ...task, ...updates };
      await offlineDb.tasks.put(updatedTask);
      await offlineDb.pendingOps.add({
        table: 'tasks', operation: 'update',
        payload: { id: task.id, updates },
        created_at: new Date().toISOString(),
      });
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      await offlineDb.tasks.put(data);
      setTasks(prev => prev.map(t => t.id === task.id ? data : t));

      // Learning Loop: Update effectiveness of the last used communication profile
      if (nextCompleted && ego) {
        let egoUpdates: Partial<Ego> = {};

        if (ego.last_used_tone) {
          const currentScores = ego.tone_effectiveness || { supportive: 50, tough_love: 50, direct: 50, challenge: 50 };
          const tone = ego.last_used_tone;
          if (currentScores[tone] !== undefined) {
            const newScore = Math.min(100, currentScores[tone] + 5);
            egoUpdates.tone_effectiveness = { ...currentScores, [tone]: newScore };
          }
        }

        if (ego.last_used_communication) {
          const currentProfile = ego.communication_profile || {
            directness: 0.5, energy: 0.5, emotional_support: 0.5,
            detail: 0.5, challenge: 0.5, humor: 0.5,
          };
          const shiftRate = 0.2;
          egoUpdates.communication_profile = {
            directness: currentProfile.directness * (1 - shiftRate) + ego.last_used_communication.directness * shiftRate,
            energy: currentProfile.energy * (1 - shiftRate) + ego.last_used_communication.energy * shiftRate,
            emotional_support: currentProfile.emotional_support * (1 - shiftRate) + ego.last_used_communication.emotional_support * shiftRate,
            detail: currentProfile.detail * (1 - shiftRate) + ego.last_used_communication.detail * shiftRate,
            challenge: currentProfile.challenge * (1 - shiftRate) + ego.last_used_communication.challenge * shiftRate,
            humor: currentProfile.humor * (1 - shiftRate) + ego.last_used_communication.humor * shiftRate,
          };
        }

        if (Object.keys(egoUpdates).length > 0) {
          await updateEgo(ego.id, egoUpdates);
        }
      }
    } catch (err: any) {
      console.error('Error toggling task:', err.message);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    if (!navigator.onLine) {
      await offlineDb.tasks.delete(id);
      await offlineDb.pendingOps.add({
        table: 'tasks', operation: 'delete', payload: { id },
        created_at: new Date().toISOString(),
      });
      setTasks(prev => prev.filter(t => t.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await offlineDb.tasks.delete(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting task:', err.message);
    }
  };

  // ── NOTIFICATION LOGS ────────────────────────────────────────────────────
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
      setLogs(prev => [data, ...prev]);
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
      setLogs(prev => prev.map(l => l.id === id ? data : l));
    } catch (err: any) {
      console.error('Error updating notification log:', err.message);
    }
  };

  // ── RESET ────────────────────────────────────────────────────────────────
  const resetAllData = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // Clear local cache too
      await offlineDb.profiles.delete(user.id);
      await offlineDb.egos.where('user_id').equals(user.id).delete();
      await offlineDb.tasks.where('user_id').equals(user.id).delete();
      await offlineDb.notes.where('user_id').equals(user.id).delete();
      await offlineDb.pendingOps.clear();

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
        isOnline,
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
