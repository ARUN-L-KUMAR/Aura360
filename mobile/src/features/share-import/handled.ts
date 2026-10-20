import AsyncStorage from '@react-native-async-storage/async-storage';

import { findHandled, parseHandled, recordHandled, type HandledEntry, type HandledOutcome } from './handled-logic';

const KEY = 'aura.shareImport.handled.v1';

/**
 * Storage is best effort: if it fails, a screenshot is simply not recognised the second time (the ledger duplicate check
 * still runs). It never blocks an import.
 */
async function load(): Promise<HandledEntry[]> {
  try {
    return parseHandled(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export async function lookupHandled(fingerprint: string | null): Promise<HandledOutcome | null> {
  if (!fingerprint) return null;
  return findHandled(await load(), fingerprint, Date.now())?.outcome ?? null;
}

export async function rememberHandled(fingerprint: string | null, outcome: HandledOutcome): Promise<void> {
  if (!fingerprint) return;
  try {
    const next = recordHandled(await load(), { fp: fingerprint, at: Date.now(), outcome }, Date.now());
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not remembering is harmless.
  }
}
