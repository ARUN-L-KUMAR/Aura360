-- =====================================================
-- Balances Table Schema for LifeSync Finance Module
-- =====================================================
-- This table tracks real account balances (GPay, Cash)
-- to calculate the difference vs expected balance
-- =====================================================

-- Create balances table
CREATE TABLE IF NOT EXISTS public.balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cash_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  account_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_updated_at ON public.balances(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_balances_user_updated ON public.balances(user_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for balances table
CREATE POLICY "Users can view own balances" ON public.balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balances" ON public.balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balances" ON public.balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own balances" ON public.balances
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_balances_updated_at BEFORE UPDATE ON public.balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Queries
-- =====================================================

-- Get latest balance for user
-- SELECT cash_balance, account_balance, updated_at
-- FROM public.balances
-- WHERE user_id = '<USER_ID>'
-- ORDER BY updated_at DESC
-- LIMIT 1;

-- Get total real balance
-- SELECT (cash_balance + account_balance) as total_real_balance
-- FROM public.balances
-- WHERE user_id = '<USER_ID>'
-- ORDER BY updated_at DESC
-- LIMIT 1;

-- Get expected balance (from finances table)
-- SELECT 
--   SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
--   SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
--   SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as expected_balance
-- FROM public.finances
-- WHERE user_id = '<USER_ID>';

-- Calculate mismatch
-- WITH real_balance AS (
--   SELECT (cash_balance + account_balance) as total_real
--   FROM public.balances
--   WHERE user_id = '<USER_ID>'
--   ORDER BY updated_at DESC
--   LIMIT 1
-- ),
-- expected_balance AS (
--   SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as total_expected
--   FROM public.finances
--   WHERE user_id = '<USER_ID>'
-- )
-- SELECT 
--   (SELECT total_real FROM real_balance) as real_balance,
--   (SELECT total_expected FROM expected_balance) as expected_balance,
--   (SELECT total_real FROM real_balance) - (SELECT total_expected FROM expected_balance) as difference;

-- =====================================================
-- End of Balances Schema
-- =====================================================
