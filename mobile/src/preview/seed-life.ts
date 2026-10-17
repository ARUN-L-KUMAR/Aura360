import type { FashionItem, FashionOutfit, FashionProfileData } from '@/features/fashion/types';
import type { AppNotification } from '@/features/notifications/types';
import type { Note } from '@/features/notes/types';
import type { SavedItem } from '@/features/saved/types';

import { isoDaysAgo, stamp } from './seed-util';

const at = (daysBack: number, hour: number, minute = 0) => stamp(isoDaysAgo(daysBack), hour, minute);

// ---------------------------------------------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------------------------------------------

const item = (id: string, text: string, completed: boolean) => ({ id, text, completed });

export const NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Weekly plan',
    content: 'Ship the budgeting review on Wednesday. Block Friday afternoon for deep work.',
    category: 'Work',
    tags: ['planning', 'work'],
    isPinned: true,
    isArchived: false,
    metadata: { checklist: [item('a', 'Review budget numbers', true), item('b', 'Book dentist', false), item('c', 'Send invoice to the design client', false), item('d', 'Renew gym membership', true)] },
    createdAt: at(2, 9),
    updatedAt: at(0, 8, 30),
  },
  {
    id: 'note-2',
    title: 'Goa trip ideas',
    content: 'Stay near Palolem. Rent a scooter for two days. Try the fish thali at Gunpowder and catch sunrise at Vagator.',
    category: 'Personal',
    tags: ['travel', 'goa'],
    isPinned: true,
    isArchived: false,
    metadata: null,
    createdAt: at(12, 20),
    updatedAt: at(5, 21),
  },
  {
    id: 'note-3',
    title: 'Book notes: Atomic Habits',
    content: 'Make it obvious, attractive, easy and satisfying. Habit stacking works best after an existing routine such as coffee.',
    category: 'Learning',
    tags: ['books', 'habits'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(18, 22),
    updatedAt: at(18, 22),
  },
  {
    id: 'note-4',
    title: 'Groceries',
    content: null,
    category: 'Personal',
    tags: ['home'],
    isPinned: false,
    isArchived: false,
    metadata: { checklist: [item('a', 'Oats', true), item('b', 'Eggs (12)', true), item('c', 'Greek yogurt', false), item('d', 'Spinach and tomatoes', false), item('e', 'Peanut butter', false)] },
    createdAt: at(1, 18),
    updatedAt: at(0, 7),
  },
  {
    id: 'note-5',
    title: 'App ideas',
    content: 'A shared household budget with split reminders. A tiny habit tracker that lives in the lock screen.',
    category: 'Ideas',
    tags: ['ideas'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(25, 23),
    updatedAt: at(9, 22),
  },
  {
    id: 'note-6',
    title: 'Running plan for 10K',
    content: 'Week 1: 3 x 5 km easy. Week 2: add one tempo run. Week 3: long run to 8 km. Taper the last week.',
    category: 'Health',
    tags: ['running', 'fitness'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(30, 7),
    updatedAt: at(14, 7),
  },
  {
    id: 'note-7',
    title: 'Meeting with Priya',
    content: 'Agreed on the new onboarding flow. She will share the wireframes by Thursday.',
    category: 'Work',
    tags: ['meetings'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(3, 15),
    updatedAt: at(3, 15),
  },
  {
    id: 'note-8',
    title: 'Gift ideas for Mom',
    content: 'Silk scarf, a good set of tea, or a weekend at the hill station.',
    category: 'Personal',
    tags: ['gifts'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(40, 19),
    updatedAt: at(40, 19),
  },
  {
    id: 'note-9',
    title: 'Interview prep',
    content: 'Revise system design basics, practise two behavioural stories, and prepare questions for the team.',
    category: 'Work',
    tags: ['career'],
    isPinned: false,
    isArchived: false,
    metadata: null,
    createdAt: at(6, 21),
    updatedAt: at(6, 21),
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Saved links
// ---------------------------------------------------------------------------------------------------------------

const saved = (id: string, type: SavedItem['type'], title: string, url: string, description: string, tags: string[], favorite: boolean, daysBack: number): SavedItem => ({
  id,
  type,
  title,
  url,
  description,
  imageUrl: null,
  tags,
  isFavorite: favorite,
  metadata: null,
  createdAt: at(daysBack, 12),
});

export const SAVED: SavedItem[] = [
  saved('sv-1', 'article', 'How to build a simple monthly budget', 'https://www.nerdwallet.com/article/budgeting/how-to-budget', 'A step by step guide to categories, limits and tracking.', ['money'], true, 1),
  saved('sv-2', 'video', 'Full body workout at home - 30 minutes', 'https://www.youtube.com/watch?v=abc123', 'No equipment needed, good warm-up and cool-down.', ['fitness'], false, 2),
  saved('sv-3', 'recipe', 'High protein paneer bhurji', 'https://www.indianhealthyrecipes.com/paneer-bhurji', 'Ready in 15 minutes, 28 g protein per serving.', ['food', 'protein'], true, 3),
  saved('sv-4', 'product', 'Noise cancelling headphones', 'https://www.amazon.in/dp/B09XS7JWHH', 'Sony WH-1000XM5, currently on offer.', ['gadgets'], false, 4),
  saved('sv-5', 'article', 'The case for boring investing', 'https://www.morganhousel.com/boring-investing', 'Why index funds and patience beat clever picks.', ['money', 'investing'], false, 6),
  saved('sv-6', 'video', 'Why we sleep - talk summary', 'https://www.youtube.com/watch?v=def456', 'Key points on sleep cycles and recovery.', ['health'], false, 7),
  saved('sv-7', 'recipe', 'Overnight oats three ways', 'https://www.bbcgoodfood.com/overnight-oats', 'Banana almond, apple cinnamon and chocolate peanut.', ['food'], false, 9),
  saved('sv-8', 'article', 'A beginner guide to retinol', 'https://www.healthline.com/retinol-guide', 'How to start slowly and what to avoid.', ['skincare'], true, 11),
  saved('sv-9', 'other', 'Hiking trails near Bengaluru', 'https://www.trekking.example/bengaluru', 'Nandi Hills, Skandagiri and Savandurga.', ['travel'], false, 14),
  saved('sv-10', 'product', 'Adjustable dumbbell set', 'https://www.decathlon.in/dumbbell-set', '2 to 24 kg, fits the corner of the room.', ['fitness'], false, 16),
  saved('sv-11', 'article', 'Zero-based budgeting explained', 'https://www.investopedia.com/zero-based-budgeting', 'Give every rupee a job each month.', ['money'], false, 19),
  saved('sv-12', 'video', 'Mobility routine for desk workers', 'https://www.youtube.com/watch?v=ghi789', 'Ten minutes for hips and shoulders.', ['fitness'], false, 22),
  saved('sv-13', 'recipe', 'Masala oats upma', 'https://www.cookwithmanali.com/masala-oats', 'A savoury breakfast alternative.', ['food'], false, 26),
  saved('sv-14', 'other', 'Podcast: The Ken on startups', 'https://theken.com/podcast', 'Weekly episodes about Indian tech.', ['podcast'], false, 30),
];

// ---------------------------------------------------------------------------------------------------------------
// Fashion (no photos offline: items are drawn from their colour and category)
// ---------------------------------------------------------------------------------------------------------------

type ItemSeed = Pick<FashionItem, 'name' | 'category' | 'brand' | 'color' | 'size' | 'price'> & Partial<FashionItem>;

const fashion = (n: number, seed: ItemSeed): FashionItem => ({
  id: `fash-${n}`,
  subcategory: null,
  description: null,
  imageUrl: null,
  images: null,
  status: 'wardrobe',
  condition: 'good',
  occasion: ['Casual'],
  season: ['All'],
  wearCount: 0,
  lastWornDate: null,
  tags: null,
  isFavorite: false,
  notes: null,
  metadata: null,
  purchaseDate: isoDaysAgo(30 + n * 12),
  createdAt: at(30 + n * 12, 11),
  updatedAt: at(10, 11),
  ...seed,
});

export const FASHION_ITEMS: FashionItem[] = [
  fashion(1, { name: 'White oxford shirt', category: 'Tops', brand: 'Uniqlo', color: 'White', size: 'M', price: 2490, wearCount: 14, lastWornDate: isoDaysAgo(2), occasion: ['Work', 'Casual'], isFavorite: true }),
  fashion(2, { name: 'Navy crew neck T-shirt', category: 'Tops', brand: 'H&M', color: 'Navy', size: 'M', price: 799, wearCount: 22, lastWornDate: isoDaysAgo(1) }),
  fashion(3, { name: 'Slim fit dark jeans', category: 'Bottoms', brand: 'Levi\'s', color: 'Indigo', size: '32', price: 3999, wearCount: 31, lastWornDate: isoDaysAgo(3), condition: 'needs_wash' }),
  fashion(4, { name: 'Beige chinos', category: 'Bottoms', brand: 'Marks & Spencer', color: 'Beige', size: '32', price: 2999, wearCount: 9, lastWornDate: isoDaysAgo(16), occasion: ['Work'] }),
  fashion(5, { name: 'White leather sneakers', category: 'Shoes', brand: 'Adidas', color: 'White', size: 'UK 9', price: 6999, wearCount: 27, lastWornDate: isoDaysAgo(1), isFavorite: true }),
  fashion(6, { name: 'Brown derby shoes', category: 'Shoes', brand: 'Clarks', color: 'Brown', size: 'UK 9', price: 8499, wearCount: 6, lastWornDate: isoDaysAgo(21), occasion: ['Formal', 'Work'] }),
  fashion(7, { name: 'Olive bomber jacket', category: 'Outerwear', brand: 'Zara', color: 'Olive', size: 'M', price: 5990, wearCount: 8, lastWornDate: isoDaysAgo(9), season: ['Winter'], condition: 'new' }),
  fashion(8, { name: 'Black wool overcoat', category: 'Outerwear', brand: 'Raymond', color: 'Black', size: 'M', price: 12990, wearCount: 3, lastWornDate: isoDaysAgo(70), season: ['Winter'], occasion: ['Formal'] }),
  fashion(9, { name: 'Leather watch', category: 'Accessories', brand: 'Fossil', color: 'Brown', size: null, price: 9495, wearCount: 18, lastWornDate: isoDaysAgo(2), isFavorite: true }),
  fashion(10, { name: 'Canvas belt', category: 'Accessories', brand: 'Levi\'s', color: 'Khaki', size: 'M', price: 1299, wearCount: 12, lastWornDate: isoDaysAgo(5) }),
  fashion(11, { name: 'Linen summer shirt', category: 'Tops', brand: 'FabIndia', color: 'Sky blue', size: 'M', price: 1990, status: 'wishlist', metadata: { expectedBudget: 2000, priority: 2, platform: 'Myntra' } }),
  fashion(12, { name: 'Running jacket', category: 'Outerwear', brand: 'Nike', color: 'Grey', size: 'M', price: 4995, status: 'wishlist', metadata: { expectedBudget: 4500, priority: 3, platform: 'Nike' } }),
];

export const FASHION_OUTFITS: FashionOutfit[] = [
  { id: 'fit-out-1', name: 'Smart casual Friday', itemIds: ['fash-1', 'fash-4', 'fash-6', 'fash-9'], occasion: 'Work', vibe: 'Smart', notes: null, wearCount: 5, lastWornDate: isoDaysAgo(7), wornDates: [isoDaysAgo(7), isoDaysAgo(14)] },
  { id: 'fit-out-2', name: 'Weekend coffee run', itemIds: ['fash-2', 'fash-3', 'fash-5'], occasion: 'Casual', vibe: 'Relaxed', notes: null, wearCount: 9, lastWornDate: isoDaysAgo(1), wornDates: [isoDaysAgo(1)] },
  { id: 'fit-out-3', name: 'Winter evening', itemIds: ['fash-8', 'fash-3', 'fash-6'], occasion: 'Party', vibe: 'Sharp', notes: null, wearCount: 2, lastWornDate: isoDaysAgo(70), wornDates: [isoDaysAgo(70)] },
];

export const FASHION_PROFILE: FashionProfileData = {
  gender: 'male',
  bodyType: 'athletic',
  skinTone: 'medium',
  undertone: 'warm',
  hairColor: 'black',
  hairLength: 'short',
  hairType: 'wavy',
  height: 176,
  weight: 72,
  chest: 98,
  waist: 82,
  sizeTop: 'M',
  sizeBottom: '32',
  sizeShoes: '9',
  shoeSizeSystem: 'UK',
  styleTags: ['minimal', 'smart casual'],
  favoriteColors: ['navy', 'olive', 'white'],
  avoidColors: ['neon'],
};

// ---------------------------------------------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------------------------------------------

const note = (n: number, type: AppNotification['type'], title: string, message: string, actionUrl: string | null, isRead: boolean, daysBack: number, hour: number): AppNotification => ({
  id: `notif-${n}`,
  title,
  message,
  type,
  actionUrl,
  isRead,
  createdAt: at(daysBack, hour),
});

export const NOTIFICATIONS: AppNotification[] = [
  note(1, 'warning', 'Groceries budget exceeded', 'You have spent more than your monthly groceries budget.', '/dashboard/finance?tab=budgets', false, 0, 9),
  note(2, 'success', 'Goal reached', 'You hit 100% of your Goa trip goal. Time to book it.', '/dashboard/finance?tab=goals', false, 1, 18),
  note(3, 'info', 'Workout streak', 'Four days in a row. Keep the streak going today.', '/dashboard/fitness', false, 1, 8),
  note(4, 'warning', 'Food budget at 84%', 'You are close to your Food budget for this month.', '/dashboard/finance?tab=budgets', true, 3, 12),
  note(5, 'info', 'Unworn for 60 days', 'The black wool overcoat has not been worn in a while.', '/dashboard/fashion', true, 5, 10),
  note(6, 'success', 'Weekly summary ready', 'You logged 5 workouts and stayed under your calorie target on 6 days.', null, true, 7, 19),
  note(7, 'info', 'Evening skincare', 'Retinol night. Remember sunscreen tomorrow morning.', '/dashboard/skincare', true, 9, 21),
];
