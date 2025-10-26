-- LifeSync Database Schema
-- Version 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finances table
CREATE TABLE IF NOT EXISTS public.finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time logs table
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  category TEXT,
  duration_minutes INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fitness table
CREATE TABLE IF NOT EXISTS public.fitness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workout', 'measurement', 'goal')),
  workout_type TEXT,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  measurement_type TEXT,
  measurement_value DECIMAL(10, 2),
  measurement_unit TEXT,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food table
CREATE TABLE IF NOT EXISTS public.food (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  calories INTEGER,
  protein DECIMAL(10, 2),
  carbs DECIMAL(10, 2),
  fats DECIMAL(10, 2),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved items table
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('article', 'video', 'product', 'recipe', 'other')),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fashion table
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

-- Skincare table
CREATE TABLE IF NOT EXISTS public.skincare (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  routine_time TEXT CHECK (routine_time IN ('morning', 'evening', 'both')),
  frequency TEXT,
  purchase_date DATE,
  expiry_date DATE,
  price DECIMAL(10, 2),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood TEXT,
  gratitude TEXT,
  highlights TEXT,
  challenges TEXT,
  tomorrow_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_finances_user_id ON public.finances(user_id);
CREATE INDEX IF NOT EXISTS idx_finances_date ON public.finances(date);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON public.time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_user_id ON public.fitness(user_id);
CREATE INDEX IF NOT EXISTS idx_food_user_id ON public.food(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_fashion_user_id ON public.fashion(user_id);
CREATE INDEX IF NOT EXISTS idx_skincare_user_id ON public.skincare(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON public.reflections(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fashion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skincare ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for notes table
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for finances table
CREATE POLICY "Users can view own finances" ON public.finances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finances" ON public.finances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finances" ON public.finances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finances" ON public.finances
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for time_logs table
CREATE POLICY "Users can view own time_logs" ON public.time_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time_logs" ON public.time_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time_logs" ON public.time_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time_logs" ON public.time_logs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fitness table
CREATE POLICY "Users can view own fitness" ON public.fitness
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness" ON public.fitness
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fitness" ON public.fitness
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fitness" ON public.fitness
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for food table
CREATE POLICY "Users can view own food" ON public.food
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food" ON public.food
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food" ON public.food
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food" ON public.food
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for saved_items table
CREATE POLICY "Users can view own saved_items" ON public.saved_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved_items" ON public.saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_items" ON public.saved_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_items" ON public.saved_items
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fashion table
CREATE POLICY "Users can view own fashion" ON public.fashion
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fashion" ON public.fashion
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fashion" ON public.fashion
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fashion" ON public.fashion
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for skincare table
CREATE POLICY "Users can view own skincare" ON public.skincare
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skincare" ON public.skincare
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skincare" ON public.skincare
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skincare" ON public.skincare
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reflections table
CREATE POLICY "Users can view own reflections" ON public.reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections" ON public.reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections" ON public.reflections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections" ON public.reflections
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON public.finances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_logs_updated_at BEFORE UPDATE ON public.time_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fitness_updated_at BEFORE UPDATE ON public.fitness
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_updated_at BEFORE UPDATE ON public.food
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_items_updated_at BEFORE UPDATE ON public.saved_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fashion_updated_at BEFORE UPDATE ON public.fashion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skincare_updated_at BEFORE UPDATE ON public.skincare
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
