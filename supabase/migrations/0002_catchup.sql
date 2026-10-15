-- 0002_catchup.sql
-- Captures everything applied by hand in the Supabase SQL Editor since
-- 0001_init.sql, so this repo actually reflects the live schema again.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Fix: the original "profiles: admins read all" policy queried profiles
-- from inside a policy on profiles itself — infinite recursion. Route the
-- check through a SECURITY DEFINER function so it bypasses RLS instead of
-- re-triggering it.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
);
$$;

drop policy if exists "profiles: admins read all" on public.profiles;

create policy "profiles: admins read all" on public.profiles
  for select using ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- cohorts: admins can create cohorts and flip the phase-gate timestamps.
-- ---------------------------------------------------------------------------
drop policy if exists "cohorts: admins write" on public.cohorts;

create policy "cohorts: admins write" on public.cohorts
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- questions: correctness is "which of the 4 choices is correct" (an index
-- into the choices array), not a freestanding text field that could drift
-- out of sync with the choices themselves. correct_answer stays in place,
-- unused, rather than dropping a column with a NOT NULL history.
-- ---------------------------------------------------------------------------
alter table public.questions
    add column if not exists correct_choice_index int;

alter table public.questions
    alter column correct_answer drop not null;

-- ---------------------------------------------------------------------------
-- submissions: a student can read/write their own; admins can read all.
-- ---------------------------------------------------------------------------
drop policy if exists "submissions: owner rw" on public.submissions;
drop policy if exists "submissions: admins read all" on public.submissions;

create policy "submissions: owner rw" on public.submissions
  for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

create policy "submissions: admins read all" on public.submissions
  for select using ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- questions: ownership is inherited through the submission, since a
-- question has no user_id column of its own.
-- ---------------------------------------------------------------------------
drop policy if exists "questions: owner rw" on public.questions;
drop policy if exists "questions: admins read all" on public.questions;

create policy "questions: owner rw" on public.questions
  for all using (
    exists (
      select 1 from public.submissions s
      where s.id = questions.submission_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.submissions s
      where s.id = questions.submission_id and s.user_id = auth.uid()
    )
  );

create policy "questions: admins read all" on public.questions
  for select using ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- admin_feedback: admins read/write; a student can read feedback left on
-- their own submission, but never write any.
-- ---------------------------------------------------------------------------
drop policy if exists "admin_feedback: admins rw" on public.admin_feedback;
drop policy if exists "admin_feedback: owner read" on public.admin_feedback;

create policy "admin_feedback: admins rw" on public.admin_feedback
  for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "admin_feedback: owner read" on public.admin_feedback
  for select using (
                                  exists (
                                  select 1 from public.submissions s
                                  where s.id = admin_feedback.submission_id and s.user_id = auth.uid()
                                  )
                                  );

-- ---------------------------------------------------------------------------
-- groups / group_members: only the admin group-formation action touches
-- these directly. Students never query them — their assigned work comes
-- through validations instead.
-- ---------------------------------------------------------------------------
drop policy if exists "groups: admins write" on public.groups;
drop policy if exists "group_members: admins write" on public.group_members;

create policy "groups: admins write" on public.groups
  for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "group_members: admins write" on public.group_members
  for all using ( public.is_admin() ) with check ( public.is_admin() );

-- ---------------------------------------------------------------------------
-- validations: admins create the assignment rows and can read everything.
-- A validator can see and fill in their own assigned rows, but a row's
-- existence is the assignment — students get select+update, never insert.
-- ---------------------------------------------------------------------------
drop policy if exists "validations: admins write" on public.validations;
drop policy if exists "validations: validator select own" on public.validations;
drop policy if exists "validations: validator update own" on public.validations;

create policy "validations: admins write" on public.validations
  for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "validations: validator select own" on public.validations
  for select using ( auth.uid() = validator_id );

create policy "validations: validator update own" on public.validations
  for update using ( auth.uid() = validator_id )
      with check ( auth.uid() = validator_id );