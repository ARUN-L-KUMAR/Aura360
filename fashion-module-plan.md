# Fashion Module Architecture Plan

## Overview
The Fashion Module will be redesigned with three main tabs: My Wardrobe, Need to Buy, and Fashion Sense.

## Database Schema Updates

### Current Fashion Table
```sql
CREATE TABLE IF NOT EXISTS public.fashion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  color TEXT,
  size TEXT,
  purchase_date DATE,
  price DECIMAL(10, 2),
  image_url TEXT,
  buying_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Proposed Updates
Add the following fields to support the three tabs:

```sql
-- Add new columns to fashion table
ALTER TABLE public.fashion ADD COLUMN type TEXT NOT NULL DEFAULT 'buyed' CHECK (type IN ('buyed', 'need_to_buy'));
ALTER TABLE public.fashion ADD COLUMN status TEXT; -- For wardrobe status (New, Worn, Washed, etc.)
ALTER TABLE public.fashion ADD COLUMN occasion TEXT[]; -- Array of occasions (party, college, trip, etc.)
ALTER TABLE public.fashion ADD COLUMN season TEXT[]; -- Array of seasons (summer, winter, etc.)
ALTER TABLE public.fashion ADD COLUMN expected_budget DECIMAL(10, 2); -- For wishlist items
ALTER TABLE public.fashion ADD COLUMN buy_deadline DATE; -- For wishlist items
ALTER TABLE public.fashion ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
```

## UI Architecture

### Tabbed Interface
- Use shadcn/ui Tabs component
- Three tabs: My Wardrobe, Need to Buy, Fashion Sense
- Each tab shows different content and functionality

### My Wardrobe Tab
- Filter by: Type, Color, Brand, Occasion, Season
- Status badges: Recently Worn, New, Needs Wash
- Favorite toggle (⭐)
- Outfit grouping functionality

### Need to Buy Tab
- Wishlist items with buying_link
- Mark as Bought → moves to My Wardrobe
- Expected budget and deadline tracking
- Compare items functionality

### Fashion Sense Tab
- AI-powered recommendations
- Color combination generator
- Outfit suggester
- Style prompts

## Component Structure

### New Components Needed
- `FashionTabs.tsx` - Main tabbed interface
- `WardrobeView.tsx` - My Wardrobe specific view
- `WishlistView.tsx` - Need to Buy specific view
- `FashionSenseView.tsx` - AI interface view
- `OutfitCard.tsx` - For outfit combinations
- `FashionFilters.tsx` - Advanced filtering component

### Modified Components
- `AddFashionDialog.tsx` - Add type toggle and conditional fields
- `EditFashionDialog.tsx` - Same as add dialog
- `FashionCard.tsx` - Show different actions based on type
- `WardrobeGrid.tsx` - Split into different views

## TypeScript Types

Update `lib/types/database.ts`:

```typescript
fashion: {
  Row: {
    id: string
    user_id: string
    item_name: string
    category: string
    brand: string | null
    color: string | null
    size: string | null
    purchase_date: string | null
    price: number | null
    image_url: string | null
    buying_link: string | null
    notes: string | null
    type: "buyed" | "need_to_buy"
    status: string | null
    occasion: string[] | null
    season: string[] | null
    expected_budget: number | null
    buy_deadline: string | null
    is_favorite: boolean
    created_at: string
    updated_at: string
  }
  // ... Insert/Update types
}
```

## Implementation Steps

1. Update database schema
2. Update TypeScript types
3. Create tabbed UI interface
4. Modify add/edit dialogs
5. Create separate view components
6. Implement filtering and search
7. Add AI integration placeholders
8. Test all functionality

## AI Integration Plan

### Fashion Sense Features
- **Color Combination Generator**: Analyze wardrobe colors and suggest combinations
- **Outfit Recommender**: Based on occasion, weather, mood
- **Style Prompts**: Daily fashion inspiration
- **Alternative Suggestions**: For wishlist items

### API Endpoints Needed
- `POST /api/fashion/recommend-outfits` - Get outfit suggestions
- `POST /api/fashion/color-combinations` - Get color matching suggestions
- `POST /api/fashion/style-prompts` - Get daily style ideas

### Prompt Engineering
Use structured prompts with wardrobe JSON data to generate recommendations.