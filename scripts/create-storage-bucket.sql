-- Create Supabase Storage Bucket for Fashion Images
-- Run this in your Supabase SQL editor or use the Storage dashboard

-- Create the bucket (if not using dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-images', 'fashion-images', true);

-- Set up RLS policies for the fashion-images bucket
CREATE POLICY "Users can upload their own fashion images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own fashion images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own fashion images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own fashion images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fashion-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Alternative: Allow public read access for fashion images
CREATE POLICY "Public read access for fashion images" ON storage.objects
  FOR SELECT USING (bucket_id = 'fashion-images');