-- ==========================================
-- Concepts
-- ==========================================

create table if not exists public.concepts (
id uuid primary key default gen_random_uuid(),

user_id uuid references public.profiles(id) on delete cascade,

name text not null,
description text,

subject_id uuid references public.subjects(id) on delete set null,

difficulty numeric default 0.5,

created_at timestamptz default now(),
updated_at timestamptz default now()
);

create index if not exists idx_concepts_user_id
on public.concepts(user_id);

create index if not exists idx_concepts_subject_id
on public.concepts(subject_id);

-- ==========================================
-- Concept Relationships
-- ==========================================

create table if not exists public.concept_relationships (
id uuid primary key default gen_random_uuid(),

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
source_concept_id,
target_concept_id,
relationship_type
)
);

create index if not exists idx_concept_relationships_source
on public.concept_relationships(source_concept_id);

create index if not exists idx_concept_relationships_target
on public.concept_relationships(target_concept_id);

-- ==========================================
-- Questions
-- ==========================================

create table if not exists public.questions (
id uuid primary key default gen_random_uuid(),

user_id uuid not null
references public.profiles(id)
on delete cascade,

title text,

question_text text not null,

source text,

difficulty numeric default 0.5,

created_at timestamptz default now()
);

create index if not exists idx_questions_user_id
on public.questions(user_id);

-- ==========================================
-- Question Concepts
-- ==========================================

create table if not exists public.question_concepts (
id uuid primary key default gen_random_uuid(),

question_id uuid not null
references public.questions(id)
on delete cascade,

concept_id uuid not null
references public.concepts(id)
on delete cascade,

weight numeric default 1.0,

unique(question_id, concept_id)
);

create index if not exists idx_question_concepts_question
on public.question_concepts(question_id);

create index if not exists idx_question_concepts_concept
on public.question_concepts(concept_id);

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

confidence numeric default 0.5,

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

create index if not exists idx_learning_events_user_id
on public.learning_events(user_id);

create index if not exists idx_learning_events_concept_id
on public.learning_events(concept_id);

create index if not exists idx_learning_events_question_id
on public.learning_events(question_id);
