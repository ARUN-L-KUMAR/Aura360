/**
 * Breadcrumbs for `adb logcat` ("[share-import] ..."), so a share that does nothing can be followed step by step on a real
 * phone. Counts and states only: never an address, a file name, or anything read from a screenshot.
 */
export function trace(message: string) {
  console.log(`[share-import] ${message}`);
}
