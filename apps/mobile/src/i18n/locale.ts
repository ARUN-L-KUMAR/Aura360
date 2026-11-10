/**
 * The phone's locale (e.g. "en-IN"), read from Hermes' Intl so no native module is needed. Falls back to "en-IN",
 * the product's home market. Used for number, currency and date formatting; the UI language is chosen in `./index.ts`.
 */
export function getDeviceLocale(): string {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) return tag;
  } catch {
    // Intl unavailable: use the default below.
  }
  return 'en-IN';
}

/** Languages that have a catalog under ./locales. Add a folder and list it here to ship a translation. */
export const SUPPORTED_LANGUAGES = ['en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function pickLanguage(locale: string): Language {
  const base = locale.split(/[-_]/)[0]?.toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'en';
}
