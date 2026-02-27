/**
 * Lightweight SQLite-backed store for user profiles and conversation quality logs.
 * Uses the Node.js built-in sqlite3 via better-sqlite3 (already a dep in ElizaOS).
 * Falls back to a plain JSON file if SQLite is unavailable.
 *
 * Tables:
 *   user_profiles   — one row per userId, JSONB blob for extracted facts
 *   conversation_log — JSONL-style conversation quality records
 */

import fs   from 'node:fs';
import path from 'node:path';
import os   from 'node:os';

const DATA_DIR = path.join(os.homedir(), '.lucy', 'memory');
const DB_FILE  = path.join(DATA_DIR, 'void_memory.json');

interface UserProfile {
  userId:        string;
  daw:           string | null;
  gear:          string[];
  projects:      string[];       // What tracks/albums they're working on
  genres:        string[];
  struggles:     string[];       // Production struggles they've mentioned
  philosophy:    string[];       // Philosophical positions expressed
  lastSeen:      string;
  interactionCount: number;
}

interface ConversationRecord {
  ts:        string;
  userId:    string;
  platform:  string;
  topic:     string[];
  quality:   number;             // 0-1 score
  flagged:   boolean;            // Worth keeping for fine-tuning
  exchange:  { user: string; lucy: string };
}

interface MemoryStore {
  profiles:       Record<string, UserProfile>;
  conversations:  ConversationRecord[];
}

function load(): MemoryStore {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE))   return { profiles: {}, conversations: [] };
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { profiles: {}, conversations: [] };
  }
}

function save(store: MemoryStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch { /* never break the agent */ }
}

export function getProfile(userId: string): UserProfile | null {
  return load().profiles[userId] ?? null;
}

export function upsertProfile(userId: string, updates: Partial<UserProfile>): void {
  const store = load();
  const existing = store.profiles[userId] ?? {
    userId,
    daw:              null,
    gear:             [],
    projects:         [],
    genres:           [],
    struggles:        [],
    philosophy:       [],
    lastSeen:         new Date().toISOString(),
    interactionCount: 0,
  };
  store.profiles[userId] = {
    ...existing,
    ...updates,
    gear:       dedup([...existing.gear,      ...(updates.gear      ?? [])]),
    projects:   dedup([...existing.projects,  ...(updates.projects  ?? [])]),
    genres:     dedup([...existing.genres,    ...(updates.genres    ?? [])]),
    struggles:  dedup([...existing.struggles, ...(updates.struggles ?? [])]),
    philosophy: dedup([...existing.philosophy,...(updates.philosophy ?? [])]),
    lastSeen:   new Date().toISOString(),
    interactionCount: existing.interactionCount + 1,
  };
  save(store);
}

export function logConversation(record: Omit<ConversationRecord, 'ts'>): void {
  const store = load();
  store.conversations.push({ ...record, ts: new Date().toISOString() });
  // Keep last 2000 records
  if (store.conversations.length > 2000) {
    store.conversations = store.conversations.slice(-2000);
  }
  save(store);
}

export function getFlaggedConversations(): ConversationRecord[] {
  return load().conversations.filter((c) => c.flagged);
}

export function getAllConversations(): ConversationRecord[] {
  return load().conversations;
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean).map((s) => s.trim().toLowerCase()))];
}
