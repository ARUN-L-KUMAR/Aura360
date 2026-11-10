export type PreviewScheme = 'light' | 'dark';

/** The colour scheme the preview opens in: `?scheme=light|dark` in the page address (default dark). */
export function previewScheme(): PreviewScheme {
  try {
    const value = new URLSearchParams(globalThis.location?.search ?? '').get('scheme');
    return value === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
