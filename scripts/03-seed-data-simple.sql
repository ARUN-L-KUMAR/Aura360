-- Seed data for LifeSync app
-- Run this in Supabase SQL Editor after signing up

-- First, sign up through the app to create your user account
-- Then run this script to add sample data

-- Notes
INSERT INTO notes (user_id, title, content, category, tags, is_pinned)
SELECT 
  auth.uid(),
  'Welcome to LifeSync',
  'This is your first note! Use this space to capture thoughts, ideas, and reminders.',
  'personal',
  ARRAY['welcome', 'getting-started'],
  true
WHERE auth.uid() IS NOT NULL;

INSERT INTO notes (user_id, title, content, category, tags)
SELECT 
  auth.uid(),
  'Project Ideas',
  'List of project ideas to work on:\n- Build a portfolio website\n- Learn a new programming language\n- Start a side project',
  'work',
  ARRAY['projects', 'ideas'],
  false
WHERE auth.uid() IS NOT NULL;

INSERT INTO notes (user_id, title, content, category, tags)
SELECT 
  auth.uid(),
  'Grocery List',
  'Weekly groceries:\n- Fruits and vegetables\n- Milk and eggs\n- Bread\n- Chicken',
  'personal',
  ARRAY['shopping', 'groceries'],
  false
WHERE auth.uid() IS NOT NULL;

-- Finances
INSERT INTO finances (user_id, type, amount, category, description, date)
SELECT 
  auth.uid(),
  'income',
  5000.00,
  'salary',
  'Monthly salary',
  CURRENT_DATE - INTERVAL '5 days'
WHERE auth.uid() IS NOT NULL;

INSERT INTO finances (user_id, type, amount, category, description, date)
SELECT 
  auth.uid(),
  'expense',
  1200.00,
  'rent',
  'Monthly rent payment',
  CURRENT_DATE - INTERVAL '3 days'
WHERE auth.uid() IS NOT NULL;

INSERT INTO finances (user_id, type, amount, category, description, date)
SELECT 
  auth.uid(),
  'expense',
  150.00,
  'groceries',
  'Weekly grocery shopping',
  CURRENT_DATE - INTERVAL '2 days'
WHERE auth.uid() IS NOT NULL;

INSERT INTO finances (user_id, type, amount, category, description, date)
SELECT 
  auth.uid(),
  'expense',
  80.00,
  'utilities',
  'Electricity bill',
  CURRENT_DATE - INTERVAL '1 day'
WHERE auth.uid() IS NOT NULL;

INSERT INTO finances (user_id, type, amount, category, description, date)
SELECT 
  auth.uid(),
  'investment',
  500.00,
  'stocks',
  'Monthly investment in index funds',
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;

-- Fitness
INSERT INTO fitness (user_id, type, activity, duration_minutes, calories_burned, notes, date)
SELECT 
  auth.uid(),
  'workout',
  'Morning run',
  30,
  300,
  'Felt great! 5km distance',
  CURRENT_DATE - INTERVAL '2 days'
WHERE auth.uid() IS NOT NULL;

INSERT INTO fitness (user_id, type, activity, duration_minutes, calories_burned, notes, date)
SELECT 
  auth.uid(),
  'workout',
  'Gym session - Upper body',
  60,
  400,
  'Bench press, shoulder press, pull-ups',
  CURRENT_DATE - INTERVAL '1 day'
WHERE auth.uid() IS NOT NULL;

INSERT INTO fitness (user_id, type, value, unit, notes, date)
SELECT 
  auth.uid(),
  'measurement',
  75.5,
  'kg',
  'Morning weight',
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;

-- Food
INSERT INTO food (user_id, meal_type, name, calories, protein, carbs, fats, notes, date)
SELECT 
  auth.uid(),
  'breakfast',
  'Oatmeal with berries',
  350,
  12,
  55,
  8,
  'Healthy start to the day',
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;

INSERT INTO food (user_id, meal_type, name, calories, protein, carbs, fats, notes, date)
SELECT 
  auth.uid(),
  'lunch',
  'Grilled chicken salad',
  450,
  35,
  30,
  18,
  'Light and nutritious',
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;

INSERT INTO food (user_id, meal_type, name, calories, protein, carbs, fats, notes, date)
SELECT 
  auth.uid(),
  'dinner',
  'Salmon with vegetables',
  550,
  40,
  35,
  22,
  'Omega-3 rich meal',
  CURRENT_DATE - INTERVAL '1 day'
WHERE auth.uid() IS NOT NULL;

-- Fashion
INSERT INTO fashion (user_id, item_name, category, brand, color, size, purchase_date, price, notes)
SELECT 
  auth.uid(),
  'Blue Denim Jacket',
  'outerwear',
  'Levi''s',
  'Blue',
  'M',
  CURRENT_DATE - INTERVAL '30 days',
  89.99,
  'Perfect for casual outings'
WHERE auth.uid() IS NOT NULL;

INSERT INTO fashion (user_id, item_name, category, brand, color, size, purchase_date, price, notes)
SELECT 
  auth.uid(),
  'White Sneakers',
  'shoes',
  'Nike',
  'White',
  '10',
  CURRENT_DATE - INTERVAL '60 days',
  120.00,
  'Comfortable everyday shoes'
WHERE auth.uid() IS NOT NULL;

-- Skincare
INSERT INTO skincare (user_id, product_name, brand, category, routine_time, frequency, rating, expiry_date, notes)
SELECT 
  auth.uid(),
  'Hydrating Cleanser',
  'CeraVe',
  'cleanser',
  'both',
  'daily',
  5,
  CURRENT_DATE + INTERVAL '1 year',
  'Gentle and effective'
WHERE auth.uid() IS NOT NULL;

INSERT INTO skincare (user_id, product_name, brand, category, routine_time, frequency, rating, expiry_date, notes)
SELECT 
  auth.uid(),
  'Vitamin C Serum',
  'The Ordinary',
  'serum',
  'morning',
  'daily',
  4,
  CURRENT_DATE + INTERVAL '6 months',
  'Brightening effect'
WHERE auth.uid() IS NOT NULL;

-- Saved Items
INSERT INTO saved_items (user_id, title, url, category, tags, notes)
SELECT 
  auth.uid(),
  'Next.js Documentation',
  'https://nextjs.org/docs',
  'development',
  ARRAY['nextjs', 'react', 'documentation'],
  'Official Next.js docs for reference'
WHERE auth.uid() IS NOT NULL;

INSERT INTO saved_items (user_id, title, url, category, tags, notes)
SELECT 
  auth.uid(),
  'Healthy Recipe Blog',
  'https://example.com/recipes',
  'food',
  ARRAY['recipes', 'healthy', 'cooking'],
  'Great collection of healthy recipes'
WHERE auth.uid() IS NOT NULL;

-- Time Logs
INSERT INTO time_logs (user_id, activity, category, duration_minutes, notes, date)
SELECT 
  auth.uid(),
  'Deep work session',
  'work',
  120,
  'Focused coding on new feature',
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;

INSERT INTO time_logs (user_id, activity, category, duration_minutes, notes, date)
SELECT 
  auth.uid(),
  'Reading',
  'learning',
  45,
  'Technical book on system design',
  CURRENT_DATE - INTERVAL '1 day'
WHERE auth.uid() IS NOT NULL;

-- Reflections
INSERT INTO reflections (user_id, title, content, mood, tags, date)
SELECT 
  auth.uid(),
  'Productive Day',
  'Had a great day today. Completed all my tasks and felt energized throughout.',
  'happy',
  ARRAY['productivity', 'gratitude'],
  CURRENT_DATE
WHERE auth.uid() IS NOT NULL;
