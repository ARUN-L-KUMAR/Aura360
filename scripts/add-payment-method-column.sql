-- =====================================================
-- Add payment_method column to finances table
-- =====================================================
-- Run this script in Supabase SQL Editor to add
-- the payment_method column if it doesn't exist
-- =====================================================

-- Add payment_method column if it doesn't exist
ALTER TABLE finances 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Set default value for existing records based on type
-- Income/Investment typically via Bank Transfer, Expenses via UPI
UPDATE finances 
SET payment_method = CASE
  WHEN type = 'income' THEN 'bank_transfer'
  WHEN type = 'investment' THEN 'bank_transfer'
  WHEN type = 'expense' THEN 'upi'
  ELSE 'other'
END
WHERE payment_method IS NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'finances' AND column_name = 'payment_method';

-- Show summary of payment methods
SELECT 
  payment_method,
  type,
  COUNT(*) as count
FROM finances
GROUP BY payment_method, type
ORDER BY payment_method, type;
