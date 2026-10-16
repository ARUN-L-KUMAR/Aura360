import type { Resources } from './locales/en';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: Resources;
    returnNull: false;
  }
}
