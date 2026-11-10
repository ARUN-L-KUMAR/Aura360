import * as Crypto from 'expo-crypto';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';

import type { ImportErrorCode } from './types';
import { SNIFF_BYTES, sniffImage, type ImageMime } from './sniff';

/**
 * Brings a shared screenshot into the app's own storage.
 *
 * Why not read the address Android gave us directly: it is only valid while the share's temporary permission lasts
 * (it ends with the task), and the sender's file name must never become a path on our side. So the image is copied once,
 * straight away, to a file named by a random id in the app's cache, checked, and used from there. The library's own
 * "resolved payload" helper is deliberately not used: it names the copy after the sender's display name, which lets a
 * hostile sender write outside the cache folder and lets two shares overwrite each other.
 *
 * The copy is never logged or sent anywhere except to be read by the signed-in user's own server.
 */

/** Payment screenshots are a few hundred KB; anything past this is not one (and would be slow to upload). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FOLDER = 'share-import';
/** Copies older than this at app start belong to a session that is gone. */
const STALE_AFTER_MS = 30 * 60 * 1000;

export class StageError extends Error {
  constructor(public code: ImportErrorCode) {
    super(code);
    this.name = 'StageError';
  }
}

export type StagedImage = {
  /** file:// address of the app's own copy. */
  fileUri: string;
  /** What the file really is, from its first bytes. */
  mimeType: ImageMime;
  /** md5 of the copy; null if the platform could not compute it. */
  fingerprint: string | null;
  bytes: number;
};

function folder(): Directory {
  const directory = new Directory(Paths.cache, FOLDER);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function remove(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Already gone, or not ours to delete: nothing more to do.
  }
}

function readHead(file: File): Uint8Array {
  const handle = file.open(FileMode.ReadOnly);
  try {
    return handle.readBytes(SNIFF_BYTES);
  } finally {
    handle.close();
  }
}

/**
 * Copies a content:// address into `target`. The current file API is tried first; if it throws (it rebuilds the address
 * through a URL parser, which an unusual provider address might not survive), the older copy is used, which hands the
 * address straight to Android's ContentResolver. Both only ever write to the random-named `target`.
 */
async function copyIn(sourceUri: string, target: File) {
  try {
    await new File(sourceUri).copy(target);
  } catch {
    await copyAsync({ from: sourceUri, to: target.uri });
  }
}

/** Copies, size-checks and type-checks one shared image. Throws a StageError; leaves no file behind when it does. */
export async function stageSharedImage(sourceUri: string): Promise<StagedImage> {
  const target = new File(folder(), `${Crypto.randomUUID()}.img`);

  try {
    try {
      await copyIn(sourceUri, target);
    } catch {
      // Permission gone, provider crashed, file removed: from our side they all mean "cannot be opened".
      throw new StageError('unreadable');
    }

    const bytes = target.size;
    if (!bytes) throw new StageError('unreadable');
    if (bytes > MAX_IMAGE_BYTES) throw new StageError('tooLarge');

    const mimeType = sniffImage(readHead(target));
    if (!mimeType) throw new StageError('unsupportedType');

    return { fileUri: target.uri, mimeType, fingerprint: target.md5, bytes };
  } catch (error) {
    remove(target);
    throw error instanceof StageError ? error : new StageError('unreadable');
  }
}

/** The copy as base64, for the upload. Read late (not at staging) so waiting screenshots do not sit in memory. */
export async function readStagedBase64(fileUri: string): Promise<string> {
  try {
    return await new File(fileUri).base64();
  } catch {
    throw new StageError('unreadable');
  }
}

export function deleteStaged(fileUri: string | null) {
  if (!fileUri) return;
  remove(new File(fileUri));
}

/** At app start: removes copies left behind by a session that ended without cleaning up (a crash, a force stop). */
export function sweepStaleStaged(now = Date.now()) {
  try {
    for (const entry of folder().list()) {
      if (!(entry instanceof File)) continue;
      const touched = entry.modificationTime;
      if (touched === null || now - touched > STALE_AFTER_MS) remove(entry);
    }
  } catch {
    // Nothing to sweep, or the folder could not be read.
  }
}
