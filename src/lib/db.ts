import Dexie, { type Table } from 'dexie';

export interface Profile {
  id: string;
  name: string;
  streak: number;
  lastCompletedTaskDate?: string;
  timezone: string;
  createdAt: string;
}

export interface Ego {
  id: string;
  userId: string;
  goal: string;
  reason: string;
  category: 'health' | 'career' | 'relationships' | 'finance' | 'mindset';
  active: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  type: 'short_term' | 'long_term';
  scheduledTime?: string; // e.g., "06:00" for short_term daily tasks
  targetDate?: string; // e.g., "2026-12-31" for long_term goals
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  taskId: string;
  timeOfDay: 'morning' | 'lunch' | 'evening';
  notificationTitle: string;
  notificationBody: string;
  tone: string;
  microAction?: string;
  deliveredAt?: string;
  opened: boolean;
  response?: 'yes' | 'no';
}

export class LeadDatabase extends Dexie {
  profiles!: Table<Profile>;
  egos!: Table<Ego>;
  tasks!: Table<Task>;
  notificationLog!: Table<NotificationLog>;

  constructor() {
    super('EgoTrackDB');
    this.version(2).stores({
      profiles: 'id',
      egos: 'id, userId',
      tasks: 'id, userId, type, completed, scheduledTime, targetDate',
      notificationLog: 'id, userId, taskId, timeOfDay',
    });
    this.version(3).stores({
      profiles: 'id',
      egos: 'id, userId, active',
      tasks: 'id, userId, type, completed, scheduledTime, targetDate',
      notificationLog: 'id, userId, taskId, timeOfDay',
    });
  }
}

export const db = new LeadDatabase();
