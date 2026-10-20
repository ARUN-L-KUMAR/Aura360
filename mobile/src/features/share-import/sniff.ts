/**
 * Tells what a file really is from its first bytes. The type a sending app declares is not trusted: a crafted share can
 * claim "image/png" for anything, so nothing is uploaded unless it starts like a JPEG, a PNG or a WebP image.
 * Pure, so it runs under plain Node in tests/.
 */
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** How many leading bytes `sniffImage` needs. */
export const SNIFF_BYTES = 12;

const startsWith = (bytes: ArrayLike<number>, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((byte, i) => bytes[offset + i] === byte);

export function sniffImage(head: ArrayLike<number>): ImageMime | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // WebP: "RIFF", four size bytes, then "WEBP"
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}
