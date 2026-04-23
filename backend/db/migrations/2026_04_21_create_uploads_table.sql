-- Migration: Create uploads (resources) table for storing file metadata
-- Run this in Supabase SQL editor or via psql connected to your database.

-- extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store metadata; actual file bytes live in Supabase Storage
CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  bucket text NOT NULL DEFAULT 'studyos-uploads',
  mime_type text,
  file_size bigint,
  public_url text,
  extracted_text text,
  processed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  uploaded_at timestamptz DEFAULT now(),
  last_processed_at timestamptz
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS uploads_user_id_idx ON public.uploads (user_id);
CREATE INDEX IF NOT EXISTS uploads_subject_id_idx ON public.uploads (subject_id);
CREATE INDEX IF NOT EXISTS uploads_bucket_idx ON public.uploads (bucket);
CREATE INDEX IF NOT EXISTS uploads_created_at_idx ON public.uploads (created_at);

-- Enable Row Level Security and add policies so users can manage their own uploads
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select their own rows
CREATE POLICY "uploads_select_owner" ON public.uploads
  FOR SELECT USING ( auth.uid() = user_id );

-- Allow authenticated users to insert rows only for themselves
CREATE POLICY "uploads_insert_owner" ON public.uploads
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

-- Allow owners to update their rows (restrict fields as needed)
CREATE POLICY "uploads_update_owner" ON public.uploads
  FOR UPDATE USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- Allow owners to delete their rows
CREATE POLICY "uploads_delete_owner" ON public.uploads
  FOR DELETE USING ( auth.uid() = user_id );

-- Optional: allow anon/public (or specific roles) to select rows if you want shared access
-- Example: allow any authenticated user to select uploads for a subject (read-only sharing)
-- CREATE POLICY "uploads_select_by_subject" ON public.uploads
--   FOR SELECT USING ( subject_id IS NOT NULL );

-- Notes:
-- 1) Store files in Supabase Storage and save the storage_path + bucket here.
-- 2) For private files, do NOT rely on public_url; instead generate signed URLs via the Storage API.
-- 3) If you want your backend (service role) to bypass RLS, it can use the service_role key.

-- End of migration
