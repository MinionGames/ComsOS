-- Add a 'name' column to the profiles table in Supabase
ALTER TABLE profiles ADD COLUMN name TEXT;

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  type text check (type in ('task', 'note', 'file')) not null,
  title text not null,
  content text,
  file_url text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);