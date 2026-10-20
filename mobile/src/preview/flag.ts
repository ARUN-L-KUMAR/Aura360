/**
 * Developer-only visual preview (`npm run preview:web`). Metro inlines EXPO_PUBLIC_* at export time, so with the flag
 * unset this is the constant `false` and every `if (PREVIEW)` branch is dead code: production behaviour is unchanged.
 */
export const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1';
