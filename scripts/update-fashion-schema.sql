-- Update Fashion Table Schema for Three-Tab Architecture
-- Run this script in your Supabase SQL editor or database console

-- Add new columns to existing fashion table
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'buyed' CHECK (type IN ('buyed', 'need_to_buy'));
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS occasion TEXT[];
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS season TEXT[];
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS expected_budget DECIMAL(10, 2);
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS buy_deadline DATE;
ALTER TABLE public.fashion ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Update existing records to have the correct type (assuming existing items are bought)
UPDATE public.fashion SET type = 'buyed' WHERE type IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.fashion.type IS 'Type of fashion item: buyed (owned) or need_to_buy (wishlist)';
COMMENT ON COLUMN public.fashion.status IS 'Status for owned items: New, Worn, Needs Wash, etc.';
COMMENT ON COLUMN public.fashion.occasion IS 'Array of occasions this item is suitable for';
COMMENT ON COLUMN public.fashion.season IS 'Array of seasons this item is suitable for';
COMMENT ON COLUMN public.fashion.expected_budget IS 'Expected budget for wishlist items';
COMMENT ON COLUMN public.fashion.buy_deadline IS 'Deadline to buy wishlist items';
COMMENT ON COLUMN public.fashion.is_favorite IS 'Whether this item is marked as favorite';

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_fashion_type ON public.fashion(type);
CREATE INDEX IF NOT EXISTS idx_fashion_status ON public.fashion(status);
CREATE INDEX IF NOT EXISTS idx_fashion_occasion ON public.fashion USING GIN(occasion);
CREATE INDEX IF NOT EXISTS idx_fashion_season ON public.fashion USING GIN(season);
CREATE INDEX IF NOT EXISTS idx_fashion_is_favorite ON public.fashion(is_favorite);
CREATE INDEX IF NOT EXISTS idx_fashion_buy_deadline ON public.fashion(buy_deadline);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fashion' AND table_schema = 'public'
ORDER BY ordinal_position;