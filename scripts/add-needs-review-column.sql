-- Add needs_review column to finances table
-- This column tracks rows imported from Excel that have missing/invalid data
-- but were kept to prevent data loss

ALTER TABLE public.finances
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN public.finances.needs_review IS 'Flag indicating transaction has missing/invalid data (e.g., amount=0, missing date) and needs manual review';

-- Create index for filtering needs_review rows
CREATE INDEX IF NOT EXISTS idx_finances_needs_review ON public.finances(needs_review) WHERE needs_review = TRUE;
