import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { getDeviceLocale, pickLanguage } from './locale';
import { en } from './locales/en';

export { getDeviceLocale } from './locale';

/**
 * i18n setup (imported once for its side effect by the root layout). Strings live in `./locales/<lang>/<namespace>.json`
 * and are read through `useTranslation('<namespace>')` / `t('<namespace>:key')`, never typed inline in components.
 */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: en as unknown as Record<string, Record<string, unknown>> },
  lng: pickLanguage(getDeviceLocale()),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(en),
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export { i18n, useTranslation };
export default i18n;
