export type FashionStatus = 'wardrobe' | 'wishlist' | 'sold' | 'donated';
export type FashionCondition = 'new' | 'good' | 'fair' | 'needs_repair' | 'needs_wash';

export interface FashionMetadata {
  buyingLink?: string;
  occasion?: string[];
  season?: string[];
  expectedBudget?: number;
  buyDeadline?: string;
  condition?: string;
  priority?: number;
  originalPrice?: number;
  discount?: string;
  rating?: number;
  reviewsCount?: number;
  platform?: string;
  availableSizes?: string[];
  availableColors?: string[];
  [key: string]: unknown;
}

export interface FashionItem {
  id: string;
  workspaceId?: string;
  userId?: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | string | null;
  purchaseDate?: string | Date | null;
  imageUrl?: string | null;
  images?: string[] | null;
  status: FashionStatus;
  condition?: FashionCondition | null;
  occasion?: string[] | null;
  season?: string[] | null;
  wearCount?: number | null;
  lastWornDate?: string | Date | null;
  tags?: string[] | null;
  isFavorite?: boolean | null;
  notes?: string | null;
  metadata?: FashionMetadata | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface FashionOutfit {
  id: string;
  workspaceId?: string;
  userId?: string;
  name: string;
  itemIds: string[];
  occasion?: string | null;
  vibe?: string | null;
  notes?: string | null;
  wearCount?: number;
  lastWornDate?: string | null;
  wornDates?: string[] | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface FashionProfileData {
  gender?: string | null;
  bodyType?: string | null;
  skinTone?: string | null;
  undertone?: string | null;
  hairColor?: string | null;
  hairLength?: string | null;
  hairType?: string | null;
  facialHair?: string | null;
  eyeColor?: string | null;
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulders?: number | null;
  sleeve?: number | null;
  inseam?: number | null;
  neck?: number | null;
  preferredFitTop?: string | null;
  preferredFitBottom?: string | null;
  sizeTop?: string | null;
  sizeBottom?: string | null;
  sizeShoes?: string | null;
  shoeSizeSystem?: 'UK' | 'US' | 'EU' | null;
  sizeDress?: string | null;
  sizeJacket?: string | null;
  styleTags?: string[] | null;
  favoriteColors?: string[] | null;
  avoidColors?: string[] | null;
  notes?: string | null;
  profilePhotoUrl?: string | null;
}

export interface ScrapedProduct {
  product_name: string;
  brand: string;
  category: string;
  price: {
    current: string;
    original?: string;
    discount?: string;
  };
  color: string;
  size: string[] | string;
  description: string;
  images: string[];
  buying_link: string;
  platform: string;
}

export const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'] as const;
export const CONDITIONS = [
  { value: 'new', label: 'Brand New', color: '#10b981' },
  { value: 'good', label: 'Good Condition', color: '#3b82f6' },
  { value: 'fair', label: 'Fair / Well Worn', color: '#f59e0b' },
  { value: 'needs_repair', label: 'Needs Repair', color: '#f97316' },
  { value: 'needs_wash', label: 'Needs Wash (Laundry)', color: '#ef4444' },
] as const;

export const OCCASIONS = ['Casual', 'Work', 'College', 'Party', 'Formal', 'Sports', 'Trip', 'Date'] as const;
export const SEASONS = ['All', 'Summer', 'Winter', 'Spring', 'Fall'] as const;
