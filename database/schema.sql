begin;

create extension if not exists pgcrypto;

-- -----------------------------
-- Helper functions
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -----------------------------
-- Profiles (new)
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null unique,
  created_at timestamptz default now(),
  name text,
  theta numeric
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------
-- Subjects
-- -----------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  description text,
  "order" integer,
  theta numeric
);

-- -----------------------------
-- Decks
-- -----------------------------
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_name text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  mastery_level numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "order" integer
);

drop trigger if exists trg_decks_updated_at on public.decks;
create trigger trg_decks_updated_at
before update on public.decks
for each row execute function public.set_updated_at();

-- -----------------------------
-- Uploads
-- -----------------------------
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  bucket text not null default 'comsos-uploads',
  mime_type text,
  file_size bigint,
  public_url text,
  extracted_text text,
  processed boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  uploaded_at timestamptz default now(),
  last_processed_at timestamptz
);

-- -----------------------------
-- Cards
-- -----------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  front text not null,
  back text,
  created_at timestamptz default timezone('utc', now()),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  deck_id uuid references public.decks(id) on delete set null,
  c numeric,
  beta numeric,
  review_count integer,
  s numeric
);

-- -----------------------------
-- Indexes
-- -----------------------------
create index if not exists idx_profiles_email on public.profiles(email);

create index if not exists idx_subjects_user_id on public.subjects(user_id);
create index if not exists idx_subjects_user_order on public.subjects(user_id, "order");

create index if not exists idx_decks_user_id on public.decks(user_id);
create index if not exists idx_decks_subject_id on public.decks(subject_id);
create index if not exists idx_decks_user_order on public.decks(user_id, "order");

create index if not exists idx_uploads_user_id on public.uploads(user_id);
create index if not exists idx_uploads_subject_id on public.uploads(subject_id);
create index if not exists idx_uploads_created_at on public.uploads(created_at);

create index if not exists idx_cards_user_id on public.cards(user_id);
create index if not exists idx_cards_subject_id on public.cards(subject_id);
create index if not exists idx_cards_deck_id on public.cards(deck_id);
create index if not exists idx_cards_next_review_at on public.cards(next_review_at);

-- -----------------------------
-- RLS enable
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.decks enable row level security;
alter table public.uploads enable row level security;
alter table public.cards enable row level security;

-- -----------------------------
-- Profiles policies
-- -----------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- -----------------------------
-- Subjects policies
-- -----------------------------
drop policy if exists subjects_select_own on public.subjects;
create policy subjects_select_own
on public.subjects
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists subjects_insert_own on public.subjects;
create policy subjects_insert_own
on public.subjects
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists subjects_update_own on public.subjects;
create policy subjects_update_own
on public.subjects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists subjects_delete_own on public.subjects;
create policy subjects_delete_own
on public.subjects
for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------
-- Decks policies
-- owner + optional subject ownership check
-- -----------------------------
drop policy if exists decks_select_own on public.decks;
create policy decks_select_own
on public.decks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists decks_insert_own on public.decks;
create policy decks_insert_own
on public.decks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
);

drop policy if exists decks_update_own on public.decks;
create policy decks_update_own
on public.decks
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
);

drop policy if exists decks_delete_own on public.decks;
create policy decks_delete_own
on public.decks
for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------
-- Uploads policies
-- owner + optional subject ownership check
-- -----------------------------
drop policy if exists uploads_select_own on public.uploads;
create policy uploads_select_own
on public.uploads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists uploads_insert_own on public.uploads;
create policy uploads_insert_own
on public.uploads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
);

drop policy if exists uploads_update_own on public.uploads;
create policy uploads_update_own
on public.uploads
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
);

drop policy if exists uploads_delete_own on public.uploads;
create policy uploads_delete_own
on public.uploads
for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------
-- Cards policies
-- owner + subject/deck ownership + consistency check
-- -----------------------------
drop policy if exists cards_select_own on public.cards;
create policy cards_select_own
on public.cards
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists cards_insert_own on public.cards;
create policy cards_insert_own
on public.cards
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
  and (
    deck_id is null
    or exists (
      select 1
      from public.decks d
      where d.id = deck_id
        and d.user_id = auth.uid()
        and (
          subject_id is null
          or d.subject_id is null
          or d.subject_id = subject_id
        )
    )
  )
);

drop policy if exists cards_update_own on public.cards;
create policy cards_update_own
on public.cards
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1
      from public.subjects s
      where s.id = subject_id
        and s.user_id = auth.uid()
    )
  )
  and (
    deck_id is null
    or exists (
      select 1
      from public.decks d
      where d.id = deck_id
        and d.user_id = auth.uid()
        and (
          subject_id is null
          or d.subject_id is null
          or d.subject_id = subject_id
        )
    )
  )
);

drop policy if exists cards_delete_own on public.cards;
create policy cards_delete_own
on public.cards
for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------
-- Optional storage bootstrap
-- -----------------------------
insert into storage.buckets (id, name, public)
values ('comsos-uploads', 'comsos-uploads', false)
on conflict (id) do nothing;

drop policy if exists storage_comsos_upload_insert_own on storage.objects;
create policy storage_comsos_upload_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'comsos-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_comsos_upload_select_own on storage.objects;
create policy storage_comsos_upload_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'comsos-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_comsos_upload_update_own on storage.objects;
create policy storage_comsos_upload_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'comsos-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'comsos-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists storage_comsos_upload_delete_own on storage.objects;
create policy storage_comsos_upload_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'comsos-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;