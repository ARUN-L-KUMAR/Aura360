-- =====================================================
-- Finance Transactions Table Schema for Supabase
-- =====================================================
-- This script creates the transactions table optimized
-- for your LifeSync Finance Module
-- =====================================================

-- Drop existing table if you want to recreate (CAUTION!)
-- DROP TABLE IF EXISTS transactions CASCADE;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment', 'transfer')),
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  needs_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Useful Views for Analytics
-- =====================================================

-- Monthly summary view
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', date) as month,
  type,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date), type, category
ORDER BY month DESC;

-- Category summary view
CREATE OR REPLACE VIEW category_summary AS
SELECT 
  user_id,
  category,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count,
  AVG(amount) as avg_amount
FROM transactions
GROUP BY user_id, category, type
ORDER BY total_amount DESC;

-- Daily spending view
CREATE OR REPLACE VIEW daily_spending AS
SELECT 
  user_id,
  date,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as daily_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as daily_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as daily_net
FROM transactions
GROUP BY user_id, date
ORDER BY date DESC;

-- =====================================================
-- Sample Queries for Your Next.js App
-- =====================================================

-- Get total income and expenses
-- SELECT 
--   SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
--   SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
--   SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance
-- FROM transactions
-- WHERE user_id = 'a512c17b-c37c-4bf7-8ea7-a6852d14bd29';

-- Get monthly breakdown
-- SELECT * FROM monthly_summary 
-- WHERE user_id = 'a512c17b-c37c-4bf7-8ea7-a6852d14bd29'
-- ORDER BY month DESC
-- LIMIT 12;

-- Get top spending categories
-- SELECT * FROM category_summary 
-- WHERE user_id = 'a512c17b-c37c-4bf7-8ea7-a6852d14bd29'
-- AND type = 'expense'
-- ORDER BY total_amount DESC
-- LIMIT 10;

-- Get recent transactions
-- SELECT * FROM transactions
-- WHERE user_id = 'a512c17b-c37c-4bf7-8ea7-a6852d14bd29'
-- ORDER BY date DESC, created_at DESC
-- LIMIT 50;

-- =====================================================
-- Insert Your Data from JSON
-- =====================================================

-- After running this schema, you can insert your data using:
-- 1. Supabase Dashboard (Data > transactions > Insert Row)
-- 2. SQL Editor in Supabase
-- 3. Your Next.js app API route
-- 4. Supabase client library in your app

-- Example bulk insert (use your supabase_insert.json data):
-- INSERT INTO transactions (user_id, date, type, category, amount, description)
-- VALUES 
--   ('a512c17b-c37c-4bf7-8ea7-a6852d14bd29', '2024-01-14', 'income', 'miscellaneous', 300.00, 'amma+appa account'),
--   ('a512c17b-c37c-4bf7-8ea7-a6852d14bd29', '2024-01-23', 'income', 'miscellaneous', 1500.00, 'Balance in Account'),
--   -- ... add all your transactions

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if table was created
-- SELECT * FROM information_schema.tables WHERE table_name = 'transactions';

-- Check indexes
-- SELECT * FROM pg_indexes WHERE tablename = 'transactions';

-- Count transactions
-- SELECT COUNT(*) FROM transactions;

-- =====================================================
-- Cleanup (if needed)
-- =====================================================

-- To remove everything and start fresh:
-- DROP VIEW IF EXISTS monthly_summary CASCADE;
-- DROP VIEW IF EXISTS category_summary CASCADE;
-- DROP VIEW IF EXISTS daily_spending CASCADE;
-- DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS transactions CASCADE;

-- =====================================================
-- End of Schema
-- =====================================================
