-- ==========================================
-- Packages
-- ==========================================

create table if not exists public.packages (
id uuid primary key default gen_random_uuid(),

name text not null,
slug text not null unique,
description text,
version text not null default '1.0.0',
status text not null default 'draft',

created_at timestamptz default now(),
updated_at timestamptz default now()
);

drop trigger if exists trg_packages_updated_at on public.packages;
create trigger trg_packages_updated_at
before update on public.packages
for each row execute function public.set_updated_at();

create index if not exists idx_packages_slug
on public.packages(slug);

-- ==========================================
-- Concepts
-- ==========================================

create table if not exists public.concepts (
id uuid primary key default gen_random_uuid(),

user_id uuid references public.profiles(id) on delete cascade,
package_id uuid references public.packages(id) on delete cascade,

slug text,

name text not null,
description text,

domain text,

subject_id uuid references public.subjects(id) on delete set null,

difficulty numeric default 0.5,

created_at timestamptz default now(),
updated_at timestamptz default now()
);

alter table if exists public.concepts
add column if not exists package_id uuid references public.packages(id) on delete cascade;

alter table if exists public.concepts
add column if not exists slug text;

alter table if exists public.concepts
add column if not exists domain text;

create index if not exists idx_concepts_user_id
on public.concepts(user_id);

create unique index if not exists idx_concepts_package_slug
on public.concepts(package_id, slug);

create index if not exists idx_concepts_subject_id
on public.concepts(subject_id);

-- ==========================================
-- Concept Relationships
-- ==========================================

create table if not exists public.concept_relationships (
id uuid primary key default gen_random_uuid(),

package_id uuid references public.packages(id) on delete cascade,

source_concept_id uuid not null
references public.concepts(id)
on delete cascade,

target_concept_id uuid not null
references public.concepts(id)
on delete cascade,

relationship_type text not null,

strength numeric default 1.0,

created_at timestamptz default now(),

unique (
package_id,
source_concept_id,
target_concept_id,
relationship_type
)
);

alter table if exists public.concept_relationships
add column if not exists package_id uuid references public.packages(id) on delete cascade;

create index if not exists idx_concept_relationships_source
on public.concept_relationships(source_concept_id);

create index if not exists idx_concept_relationships_target
on public.concept_relationships(target_concept_id);

create unique index if not exists idx_concept_relationships_package_edges
on public.concept_relationships(package_id, source_concept_id, target_concept_id, relationship_type);

-- ==========================================
-- Questions
-- ==========================================

create table if not exists public.questions (
id uuid primary key default gen_random_uuid(),

user_id uuid not null
references public.profiles(id)
on delete cascade,

package_id uuid not null
references public.packages(id)
on delete cascade,

title text,

question_text text not null,

source text,

difficulty numeric default 0.5,

created_at timestamptz default now(),
updated_at timestamptz default now()
);

alter table if exists public.questions
add column if not exists package_id uuid references public.packages(id) on delete cascade;

alter table if exists public.questions
add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create index if not exists idx_questions_user_id
on public.questions(user_id);

create index if not exists idx_questions_package_id
on public.questions(package_id);

-- ==========================================
-- Question Concepts
-- ==========================================

create table if not exists public.question_concepts (
id uuid primary key default gen_random_uuid(),

package_id uuid not null
references public.packages(id)
on delete cascade,

question_id uuid not null
references public.questions(id)
on delete cascade,

concept_id uuid not null
references public.concepts(id)
on delete cascade,

weight numeric default 1.0,

created_at timestamptz default now(),

unique(question_id, concept_id)
);

alter table if exists public.question_concepts
add column if not exists package_id uuid references public.packages(id) on delete cascade;

alter table if exists public.question_concepts
add column if not exists created_at timestamptz default now();

create index if not exists idx_question_concepts_question
on public.question_concepts(question_id);

create index if not exists idx_question_concepts_concept
on public.question_concepts(concept_id);

create index if not exists idx_question_concepts_package
on public.question_concepts(package_id);

-- ==========================================
-- Student Concept Mastery
-- ==========================================

create table if not exists public.student_concept_mastery (
id uuid primary key default gen_random_uuid(),

user_id uuid not null
references public.profiles(id)
on delete cascade,

concept_id uuid not null
references public.concepts(id)
on delete cascade,

mastery numeric default 0.5,

constraint student_concept_mastery_mastery_range check (mastery >= 0 and mastery <= 1),

confidence numeric default 0.5,

constraint student_concept_mastery_confidence_range check (confidence >= 0 and confidence <= 1),

forgetting_rate numeric default 0.0,

last_reviewed_at timestamptz,

updated_at timestamptz default now(),

unique(user_id, concept_id)
);

create index if not exists idx_mastery_user_id
on public.student_concept_mastery(user_id);

create index if not exists idx_mastery_concept_id
on public.student_concept_mastery(concept_id);

-- ==========================================
-- Learning Events
-- ==========================================

create table if not exists public.learning_events (
id uuid primary key default gen_random_uuid(),

user_id uuid not null
references public.profiles(id)
on delete cascade,

concept_id uuid
references public.concepts(id)
on delete cascade,

question_id uuid
references public.questions(id)
on delete set null,

event_type text not null,

score numeric,

metadata jsonb default '{}'::jsonb,

created_at timestamptz default now()

);

-- ==========================================
-- Waitlist
-- ==========================================

create table if not exists public.waitlist (
id uuid primary key default gen_random_uuid(),
email text not null unique,
current_sat_score int,
target_sat_score int,
created_at timestamptz not null default now(),
constraint waitlist_current_sat_score_range check (
	current_sat_score is null or (current_sat_score >= 400 and current_sat_score <= 1600)
),
constraint waitlist_target_sat_score_range check (
	target_sat_score is null or (target_sat_score >= 400 and target_sat_score <= 1600)
)
);

create index if not exists idx_waitlist_created_at
on public.waitlist(created_at desc);

create index if not exists idx_learning_events_user_id
on public.learning_events(user_id);

create index if not exists idx_learning_events_concept_id
on public.learning_events(concept_id);

create index if not exists idx_learning_events_question_id
on public.learning_events(question_id);
