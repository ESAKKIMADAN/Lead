import Dexie, { type Table } from 'dexie';

export interface ChatSession {
  id?: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id?: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class LeadChatDB extends Dexie {
  chatSessions!: Table<ChatSession, number>;
  chatMessages!: Table<ChatMessage, number>;

  constructor() {
    super('LeadChatDB');
    this.version(1).stores({
      chatSessions: '++id, updated_at',
      chatMessages: '++id, chat_id, timestamp'
    });
  }
}

export const chatDb = new LeadChatDB();
