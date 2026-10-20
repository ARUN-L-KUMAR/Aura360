import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { i18n } from '@/i18n';

/** The picture stand-in for an item without a photo: one glyph per category. */
export function categoryIcon(value?: string | null): ComponentProps<typeof Ionicons>['name'] {
  switch ((value ?? '').toLowerCase()) {
    case 'bottoms':
      return 'layers-outline';
    case 'shoes':
      return 'footsteps-outline';
    case 'outerwear':
      return 'snow-outline';
    case 'accessories':
      return 'watch-outline';
    default:
      return 'shirt-outline';
  }
}

/**
 * Names for the values the API stores in English ("Tops", "Summer", "needs_wash"). The stored value never changes;
 * only what is drawn does. A value we do not know (a custom occasion the user typed) is shown as written, and matching
 * ignores case because older items were saved in either form. Call these while rendering, never at module scope.
 */
export function categoryLabel(value: string): string {
  switch (value.toLowerCase()) {
    case 'all':
      return i18n.t('fashion:categories.all');
    case 'tops':
      return i18n.t('fashion:categories.tops');
    case 'bottoms':
      return i18n.t('fashion:categories.bottoms');
    case 'shoes':
      return i18n.t('fashion:categories.shoes');
    case 'outerwear':
      return i18n.t('fashion:categories.outerwear');
    case 'accessories':
      return i18n.t('fashion:categories.accessories');
    default:
      return value;
  }
}

export function occasionLabel(value: string): string {
  switch (value.toLowerCase()) {
    case 'casual':
      return i18n.t('fashion:occasions.casual');
    case 'work':
      return i18n.t('fashion:occasions.work');
    case 'college':
      return i18n.t('fashion:occasions.college');
    case 'party':
      return i18n.t('fashion:occasions.party');
    case 'formal':
      return i18n.t('fashion:occasions.formal');
    case 'sports':
      return i18n.t('fashion:occasions.sports');
    case 'trip':
      return i18n.t('fashion:occasions.trip');
    case 'date':
      return i18n.t('fashion:occasions.date');
    default:
      return value;
  }
}

export function seasonLabel(value: string): string {
  switch (value.toLowerCase()) {
    case 'all':
      return i18n.t('fashion:seasons.all');
    case 'summer':
      return i18n.t('fashion:seasons.summer');
    case 'winter':
      return i18n.t('fashion:seasons.winter');
    case 'spring':
      return i18n.t('fashion:seasons.spring');
    case 'fall':
    case 'autumn':
      return i18n.t('fashion:seasons.fall');
    default:
      return value;
  }
}

export function statusLabel(value: string): string {
  switch (value) {
    case 'wardrobe':
      return i18n.t('fashion:status.wardrobe');
    case 'wishlist':
      return i18n.t('fashion:status.wishlist');
    case 'sold':
      return i18n.t('fashion:status.sold');
    case 'donated':
      return i18n.t('fashion:status.donated');
    default:
      return value;
  }
}

export function styleLabel(value: string): string {
  switch (value) {
    case 'Minimalist':
      return i18n.t('fashion:styles.minimalist');
    case 'Streetwear':
      return i18n.t('fashion:styles.streetwear');
    case 'Old money':
      return i18n.t('fashion:styles.oldMoney');
    case 'Smart casual':
      return i18n.t('fashion:styles.smartCasual');
    case 'Athleisure':
      return i18n.t('fashion:styles.athleisure');
    case 'Classic or formal':
      return i18n.t('fashion:styles.classicFormal');
    case 'Vintage':
      return i18n.t('fashion:styles.vintage');
    case 'Monochrome':
      return i18n.t('fashion:styles.monochrome');
    default:
      return value;
  }
}

export function fitLabel(value: string): string {
  switch (value) {
    case 'Slim':
      return i18n.t('fashion:fits.slim');
    case 'Regular':
      return i18n.t('fashion:fits.regular');
    case 'Relaxed':
      return i18n.t('fashion:fits.relaxed');
    case 'Oversized':
      return i18n.t('fashion:fits.oversized');
    default:
      return value;
  }
}

/** The looks' vibe suggestions. The stored value is the English word; only the drawing changes. */
export const VIBES = ['Smart', 'Relaxed', 'Sharp', 'Minimal'] as const;

export function vibeLabel(value: string): string {
  switch (value.toLowerCase()) {
    case 'smart':
      return i18n.t('fashion:vibes.smart');
    case 'relaxed':
      return i18n.t('fashion:vibes.relaxed');
    case 'sharp':
      return i18n.t('fashion:vibes.sharp');
    case 'minimal':
      return i18n.t('fashion:vibes.minimal');
    default:
      return value;
  }
}
