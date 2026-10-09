import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { DEFAULT_AI_MODEL, type AiMessage, type AiThread } from './types';

/**
 * Conversations live on the phone (the server keeps no chat history; the web app uses
 * localStorage the same way). The store sits outside React so a reply keeps streaming into
 * the right thread even if you leave the screen.
 */

type State = { hydrated: boolean; threads: AiThread[]; activeId: string | null; model: string };

const KEYS = { threads: 'aura.ai.threads', active: 'aura.ai.activeThread', model: 'aura.ai.model' } as const;
const MAX_THREADS = 30;
const MAX_MESSAGES = 120;

let state: State = { hydrated: false, threads: [], activeId: null, model: DEFAULT_AI_MODEL };
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let counter = 0;

export const newId = () => `${Date.now().toString(36)}-${counter++}-${Math.random().toString(36).slice(2, 6)}`;

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
  scheduleSave();
}

function scheduleSave() {
  if (!state.hydrated) return;
  if (saveTimer) clearTimeout(saveTimer);
  // Debounced: a streaming reply changes the state many times a second.
  saveTimer = setTimeout(() => {
    const trimmed = state.threads.slice(0, MAX_THREADS).map((thread) => ({
      ...thread,
      // Never persist half-finished UI state.
      messages: thread.messages.slice(-MAX_MESSAGES).map((message) => ({ ...message, isStreaming: false, activeTool: undefined })),
    }));
    Promise.all([
      AsyncStorage.setItem(KEYS.threads, JSON.stringify(trimmed)),
      state.activeId ? AsyncStorage.setItem(KEYS.active, state.activeId) : AsyncStorage.removeItem(KEYS.active),
      AsyncStorage.setItem(KEYS.model, state.model),
    ]).catch(() => {});
  }, 600);
}

Promise.all([AsyncStorage.getItem(KEYS.threads), AsyncStorage.getItem(KEYS.active), AsyncStorage.getItem(KEYS.model)])
  .then(([rawThreads, active, model]) => {
    let threads: AiThread[] = [];
    try {
      threads = rawThreads ? (JSON.parse(rawThreads) as AiThread[]) : [];
    } catch {
      threads = [];
    }
    emit({
      hydrated: true,
      threads,
      activeId: active && threads.some((t) => t.id === active) ? active : (threads[0]?.id ?? null),
      model: model || DEFAULT_AI_MODEL,
    });
  })
  .catch(() => emit({ ...state, hydrated: true }));

export function useAiStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

function updateThread(threadId: string, change: (thread: AiThread) => AiThread) {
  emit({ ...state, threads: state.threads.map((thread) => (thread.id === threadId ? change(thread) : thread)) });
}

export const aiActions = {
  newThread() {
    const now = new Date().toISOString();
    const thread: AiThread = { id: newId(), title: 'New chat', messages: [], createdAt: now, updatedAt: now };
    emit({ ...state, threads: [thread, ...state.threads], activeId: thread.id });
    return thread.id;
  },

  /** An empty "New chat" is reused instead of piling up blank threads. */
  ensureActiveThread() {
    const active = state.threads.find((thread) => thread.id === state.activeId);
    return active ? active.id : aiActions.newThread();
  },

  setActive(threadId: string) {
    emit({ ...state, activeId: threadId });
  },

  deleteThread(threadId: string) {
    const threads = state.threads.filter((thread) => thread.id !== threadId);
    emit({ ...state, threads, activeId: state.activeId === threadId ? (threads[0]?.id ?? null) : state.activeId });
  },

  clearAll() {
    emit({ ...state, threads: [], activeId: null });
  },

  setModel(model: string) {
    emit({ ...state, model });
  },

  addMessage(threadId: string, message: AiMessage) {
    updateThread(threadId, (thread) => {
      const firstUserText = message.role === 'user' && thread.messages.length === 0 ? message.content.trim().slice(0, 40) : null;
      return {
        ...thread,
        title: firstUserText ? (message.content.trim().length > 40 ? `${firstUserText}…` : firstUserText) : thread.title,
        messages: [...thread.messages, message],
        updatedAt: new Date().toISOString(),
      };
    });
  },

  patchMessage(threadId: string, messageId: string, patch: Partial<AiMessage>) {
    updateThread(threadId, (thread) => ({
      ...thread,
      messages: thread.messages.map((message) => (message.id === messageId ? { ...message, ...patch } : message)),
      updatedAt: new Date().toISOString(),
    }));
  },

  appendToMessage(threadId: string, messageId: string, delta: string) {
    updateThread(threadId, (thread) => ({
      ...thread,
      messages: thread.messages.map((message) => (message.id === messageId ? { ...message, content: message.content + delta } : message)),
    }));
  },
};
