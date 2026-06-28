-- ==========================================
-- Enable RLS
-- ==========================================

alter table public.concepts enable row level security;
alter table public.concept_relationships enable row level security;
alter table public.questions enable row level security;
alter table public.question_concepts enable row level security;
alter table public.student_concept_mastery enable row level security;
alter table public.learning_events enable row level security;

-- ==========================================
-- Concepts
-- ==========================================

create policy concepts_select_own
on public.concepts
for select
to authenticated
using (user_id = auth.uid());

create policy concepts_insert_own
on public.concepts
for insert
to authenticated
with check (user_id = auth.uid());

create policy concepts_update_own
on public.concepts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy concepts_delete_own
on public.concepts
for delete
to authenticated
using (user_id = auth.uid());

-- ==========================================
-- Concept Relationships
-- ==========================================

drop policy if exists concept_relationships_select_own on public.concept_relationships;
create policy concept_relationships_select_own
on public.concept_relationships
for select
to authenticated
using (
  exists (
    select 1 from public.concepts c
    where c.id = source_concept_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = target_concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists concept_relationships_insert_own on public.concept_relationships;
create policy concept_relationships_insert_own
on public.concept_relationships
for insert
to authenticated
with check (
  exists (
    select 1 from public.concepts c
    where c.id = source_concept_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = target_concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists concept_relationships_update_own on public.concept_relationships;
create policy concept_relationships_update_own
on public.concept_relationships
for update
to authenticated
using (
  exists (
    select 1 from public.concepts c
    where c.id = source_concept_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = target_concept_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.concepts c
    where c.id = source_concept_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = target_concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists concept_relationships_delete_own on public.concept_relationships;
create policy concept_relationships_delete_own
on public.concept_relationships
for delete
to authenticated
using (
  exists (
    select 1 from public.concepts c
    where c.id = source_concept_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = target_concept_id
      and c.user_id = auth.uid()
  )
);

-- ==========================================
-- Questions
-- ==========================================

create policy questions_select_own
on public.questions
for select
to authenticated
using (user_id = auth.uid());

create policy questions_insert_own
on public.questions
for insert
to authenticated
with check (user_id = auth.uid());

create policy questions_update_own
on public.questions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy questions_delete_own
on public.questions
for delete
to authenticated
using (user_id = auth.uid());

-- ==========================================
-- Question Concepts
-- ==========================================

drop policy if exists question_concepts_select_own on public.question_concepts;
create policy question_concepts_select_own
on public.question_concepts
for select
to authenticated
using (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists question_concepts_insert_own on public.question_concepts;
create policy question_concepts_insert_own
on public.question_concepts
for insert
to authenticated
with check (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists question_concepts_update_own on public.question_concepts;
create policy question_concepts_update_own
on public.question_concepts
for update
to authenticated
using (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = concept_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = concept_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists question_concepts_delete_own on public.question_concepts;
create policy question_concepts_delete_own
on public.question_concepts
for delete
to authenticated
using (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.user_id = auth.uid()
  )
  and exists (
    select 1 from public.concepts c
    where c.id = concept_id
      and c.user_id = auth.uid()
  )
);

-- ==========================================
-- Student Concept Mastery
-- ==========================================

create policy mastery_select_own
on public.student_concept_mastery
for select
to authenticated
using (user_id = auth.uid());

create policy mastery_insert_own
on public.student_concept_mastery
for insert
to authenticated
with check (user_id = auth.uid());

create policy mastery_update_own
on public.student_concept_mastery
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy mastery_delete_own
on public.student_concept_mastery
for delete
to authenticated
using (user_id = auth.uid());

-- ==========================================
-- Learning Events
-- ==========================================

create policy learning_events_select_own
on public.learning_events
for select
to authenticated
using (user_id = auth.uid());

create policy learning_events_insert_own
on public.learning_events
for insert
to authenticated
with check (user_id = auth.uid());

create policy learning_events_update_own
on public.learning_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy learning_events_delete_own
on public.learning_events
for delete
to authenticated
using (user_id = auth.uid());
