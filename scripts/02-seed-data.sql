-- Seed data for LifeSync app
-- This creates a test user and sample data across all modules

-- Note: The user will be created through Supabase Auth signup
-- This script adds sample data for a user with ID that will be created
-- You'll need to sign up first, then update the user_id in this script

-- Sample Notes
INSERT INTO notes (user_id, title, content, category, tags, is_pinned) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Welcome to LifeSync!', 'This is your first note. Start organizing your thoughts and ideas here.', 'Personal', ARRAY['welcome', 'getting-started'], true),
  ('00000000-0000-0000-0000-000000000000', 'Project Ideas', 'List of project ideas:\n- Build a personal website\n- Learn a new language\n- Start a side business', 'Work', ARRAY['projects', 'ideas'], false),
  ('00000000-0000-0000-0000-000000000000', 'Meeting Notes', 'Team meeting notes from today. Discussed Q1 goals and upcoming deadlines.', 'Work', ARRAY['meetings', 'team'], false),
  ('00000000-0000-0000-0000-000000000000', 'Book Recommendations', 'Books to read:\n- Atomic Habits\n- Deep Work\n- The Psychology of Money', 'Personal', ARRAY['books', 'reading'], true);

-- Sample Finance Transactions
INSERT INTO finances (user_id, type, amount, category, description, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'income', 5000.00, 'Salary', 'Monthly salary payment', '2025-01-01'),
  ('00000000-0000-0000-0000-000000000000', 'expense', 1200.00, 'Rent', 'Monthly rent payment', '2025-01-02'),
  ('00000000-0000-0000-0000-000000000000', 'expense', 150.00, 'Groceries', 'Weekly grocery shopping', '2025-01-05'),
  ('00000000-0000-0000-0000-000000000000', 'expense', 50.00, 'Entertainment', 'Movie tickets and dinner', '2025-01-07'),
  ('00000000-0000-0000-0000-000000000000', 'investment', 500.00, 'Stocks', 'Monthly investment contribution', '2025-01-10'),
  ('00000000-0000-0000-0000-000000000000', 'expense', 80.00, 'Utilities', 'Electricity and water bill', '2025-01-12'),
  ('00000000-0000-0000-0000-000000000000', 'income', 200.00, 'Freelance', 'Side project payment', '2025-01-15');

-- Sample Fitness Logs
INSERT INTO fitness (user_id, type, activity, duration_minutes, calories_burned, notes, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'workout', 'Morning Run', 30, 300, 'Felt great! 5km run in the park', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'workout', 'Gym Session', 60, 450, 'Upper body workout - chest and arms', '2025-01-09'),
  ('00000000-0000-0000-0000-000000000000', 'measurement', 'Weight Check', NULL, NULL, 'Weight: 75kg, Body Fat: 18%', '2025-01-10'),
  ('00000000-0000-0000-0000-000000000000', 'workout', 'Yoga', 45, 200, 'Evening yoga session for flexibility', '2025-01-11'),
  ('00000000-0000-0000-0000-000000000000', 'goal', 'Marathon Training', NULL, NULL, 'Goal: Run a half marathon by March', '2025-01-12');

-- Sample Food Logs
INSERT INTO food (user_id, meal_type, food_name, calories, protein, carbs, fats, notes, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'breakfast', 'Oatmeal with Berries', 350, 12, 55, 8, 'Healthy start to the day', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'lunch', 'Grilled Chicken Salad', 450, 35, 30, 18, 'Light and nutritious', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'snack', 'Greek Yogurt', 150, 15, 12, 5, 'Post-workout snack', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'dinner', 'Salmon with Vegetables', 550, 40, 35, 25, 'Omega-3 rich meal', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'breakfast', 'Scrambled Eggs & Toast', 400, 25, 35, 18, 'Protein-packed breakfast', '2025-01-09');

-- Sample Fashion Items
INSERT INTO fashion (user_id, item_name, category, brand, color, size, purchase_date, price, image_url, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Navy Blue Blazer', 'Outerwear', 'Hugo Boss', 'Navy', 'M', '2024-12-15', 299.99, NULL, 'Perfect for business meetings'),
  ('00000000-0000-0000-0000-000000000000', 'White Oxford Shirt', 'Tops', 'Brooks Brothers', 'White', 'M', '2024-11-20', 89.99, NULL, 'Classic wardrobe staple'),
  ('00000000-0000-0000-0000-000000000000', 'Dark Denim Jeans', 'Bottoms', 'Levis', 'Blue', '32x32', '2024-10-05', 79.99, NULL, 'Comfortable everyday wear'),
  ('00000000-0000-0000-0000-000000000000', 'Brown Leather Shoes', 'Shoes', 'Allen Edmonds', 'Brown', '10', '2024-09-12', 349.99, NULL, 'Formal occasions'),
  ('00000000-0000-0000-0000-000000000000', 'Casual Sneakers', 'Shoes', 'Nike', 'White', '10', '2025-01-03', 120.00, NULL, 'Daily wear');

-- Sample Skincare Products
INSERT INTO skincare (user_id, product_name, brand, category, routine_time, frequency, expiry_date, rating, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Gentle Cleanser', 'CeraVe', 'Cleanser', 'both', 'daily', '2025-12-31', 5, 'Great for sensitive skin'),
  ('00000000-0000-0000-0000-000000000000', 'Vitamin C Serum', 'The Ordinary', 'Serum', 'morning', 'daily', '2025-08-15', 4, 'Brightening effect'),
  ('00000000-0000-0000-0000-000000000000', 'Retinol Cream', 'Paula''s Choice', 'Treatment', 'evening', 'every-other-day', '2025-10-20', 5, 'Anti-aging benefits'),
  ('00000000-0000-0000-0000-000000000000', 'Moisturizer SPF 30', 'Neutrogena', 'Moisturizer', 'morning', 'daily', '2026-03-01', 4, 'Sun protection included'),
  ('00000000-0000-0000-0000-000000000000', 'Night Cream', 'Olay', 'Moisturizer', 'evening', 'daily', '2025-11-30', 4, 'Hydrating overnight');

-- Sample Saved Items
INSERT INTO saved_items (user_id, title, url, category, tags, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Best Productivity Apps 2025', 'https://example.com/productivity-apps', 'Article', ARRAY['productivity', 'apps'], 'Great list of tools to try'),
  ('00000000-0000-0000-0000-000000000000', 'Healthy Meal Prep Ideas', 'https://example.com/meal-prep', 'Recipe', ARRAY['food', 'health'], 'Weekly meal prep inspiration'),
  ('00000000-0000-0000-0000-000000000000', 'Home Workout Routine', 'https://example.com/workout', 'Video', ARRAY['fitness', 'workout'], 'No equipment needed'),
  ('00000000-0000-0000-0000-000000000000', 'Personal Finance Guide', 'https://example.com/finance-guide', 'Article', ARRAY['finance', 'money'], 'Comprehensive budgeting tips');

-- Sample Time Logs
INSERT INTO time_logs (user_id, activity, category, duration_minutes, notes, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Deep Work Session', 'Work', 120, 'Focused coding session on new feature', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'Team Meeting', 'Work', 60, 'Sprint planning meeting', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'Reading', 'Personal', 45, 'Finished chapter 3 of current book', '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'Exercise', 'Health', 30, 'Morning run', '2025-01-09'),
  ('00000000-0000-0000-0000-000000000000', 'Learning', 'Personal', 90, 'Online course on web development', '2025-01-09');

-- Sample Reflections
INSERT INTO reflections (user_id, content, mood, tags, date) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Great start to the week! Feeling motivated and energized. Completed all my tasks and had a good workout.', 'happy', ARRAY['motivation', 'productivity'], '2025-01-08'),
  ('00000000-0000-0000-0000-000000000000', 'Challenging day at work but learned a lot. Need to focus on better time management.', 'neutral', ARRAY['work', 'learning'], '2025-01-09'),
  ('00000000-0000-0000-0000-000000000000', 'Feeling grateful for the progress I''ve made this month. Small steps lead to big changes.', 'grateful', ARRAY['gratitude', 'progress'], '2025-01-10');

-- Note: After signing up with Supabase Auth, run this query to update all records with your actual user_id:
-- UPDATE notes SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE finances SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE fitness SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE food SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE fashion SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE skincare SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE saved_items SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE time_logs SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE reflections SET user_id = 'your-actual-user-id' WHERE user_id = '00000000-0000-0000-0000-000000000000';
