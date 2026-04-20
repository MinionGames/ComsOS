-- Run this SQL in your Supabase SQL editor to create the profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
