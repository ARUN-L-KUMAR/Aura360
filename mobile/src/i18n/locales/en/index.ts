import ai from './ai.json';
import auth from './auth.json';
import common from './common.json';
import fashion from './fashion.json';
import finance from './finance.json';
import fitness from './fitness.json';
import food from './food.json';
import home from './home.json';
import notes from './notes.json';
import notifications from './notifications.json';
import offline from './offline.json';
import onboarding from './onboarding.json';
import permissions from './permissions.json';
import saved from './saved.json';
import search from './search.json';
import settings from './settings.json';
import skincare from './skincare.json';
import time from './time.json';

/**
 * English catalog, one namespace per area (one file each, so areas never edit the same file). Keys are type-checked:
 * `t('finance:budget.title')` is a compile error when the key is missing. Plurals use i18next suffixes
 * (`items_one` / `items_other`) with `{ count }`.
 */
export const en = { ai, auth, common, fashion, finance, fitness, food, home, notes, notifications, offline, onboarding, permissions, saved, search, settings, skincare, time } as const;

export type Resources = typeof en;
