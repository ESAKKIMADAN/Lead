import Dexie, { type Table } from 'dexie';
import type { Profile, Ego, Task, Note } from './SupabaseContext';

export interface PendingOp {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: any;
  created_at: string;
}

export class LeadOfflineDB extends Dexie {
  profiles!: Table<Profile, string>;
  egos!: Table<Ego, string>;
  tasks!: Table<Task, string>;
  notes!: Table<Note, string>;
  pendingOps!: Table<PendingOp, number>;

  constructor() {
    super('LeadOfflineDB');
    this.version(1).stores({
      profiles: 'id',
      egos: 'id, user_id, active',
      tasks: 'id, user_id, type, completed',
      notes: 'id, user_id, pinned, updated_at',
      pendingOps: '++id, table, operation, created_at',
    });
  }
}

export const offlineDb = new LeadOfflineDB();
