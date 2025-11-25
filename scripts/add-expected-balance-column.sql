-- Add expected_balance column to balances table
-- This stores the calculated balance (Income - Expenses - Investments)
-- from the Balance card, so it doesn't need to be recalculated

ALTER TABLE public.balances 
ADD COLUMN IF NOT EXISTS expected_balance DECIMAL(12, 2) DEFAULT 0.00;

-- Update existing records to have 0 as default
UPDATE public.balances 
SET expected_balance = 0.00 
WHERE expected_balance IS NULL;
