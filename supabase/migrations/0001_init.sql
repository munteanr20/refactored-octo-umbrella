-- 0001_init.sql
-- Run this in the Supabase SQL Editor (or via `supabase db push`) once the
-- project exists. Safe to run on a fresh project only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per Supabase auth user. Supabase Auth owns the actual
-- credential (email + hashed password) in auth.users; we only store the
-- app-specific bits here (role) and mirror the email for convenient joins.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
-- security definer: this needs to bypass RLS on public.profiles to insert.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- cohorts: one per class/semester run. Phase gates are nullable timestamps -
-- null means "hasn't happened yet", set means "this step has occurred".
-- ---------------------------------------------------------------------------
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  m1_closed_at timestamptz,
  groups_formed_at timestamptz,
  m2_closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reason_categories: fixed by the teaching team, used in M2 validations.
-- ---------------------------------------------------------------------------
create table public.reason_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- submissions: one hypothesis per student per cohort.
-- ---------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  hypothesis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cohort_id)
);

-- ---------------------------------------------------------------------------
-- questions: the 16 MCQ items per submission.
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  prompt text not null,
  category text,
  choices jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- groups / group_members: M2 peer-review triads (or the leftover pair).
-- ---------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (group_id, user_id)
);

-- ---------------------------------------------------------------------------
-- validations: doubles as the assignment record (verdict null = pending)
-- and the completed peer-review result. One row per (question, validator).
-- ---------------------------------------------------------------------------
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  validator_id uuid not null references public.profiles (id) on delete cascade,
  verdict text check (verdict in ('valid', 'invalid')),
  reason_category_id uuid references public.reason_categories (id),
  reason_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, validator_id)
);

-- ---------------------------------------------------------------------------
-- admin_feedback: teaching team's notes on a submission (M1).
-- ---------------------------------------------------------------------------
create table public.admin_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  admin_id uuid not null references public.profiles (id),
  feedback_text text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- llm_runs / llm_answers: M3 hypothesis testing.
-- ---------------------------------------------------------------------------
create table public.llm_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  model_name text not null,
  config jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now()
);

create table public.llm_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.llm_runs (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  answer text,
  is_correct boolean,
  raw_response jsonb
);

-- ---------------------------------------------------------------------------
-- reliability_stats: computed kappa/ICC on M2 validation data.
-- ---------------------------------------------------------------------------
create table public.reliability_stats (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  metric_type text not null,
  value numeric,
  computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.reason_categories enable row level security;
alter table public.submissions enable row level security;
alter table public.questions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.validations enable row level security;
alter table public.admin_feedback enable row level security;
alter table public.llm_runs enable row level security;
alter table public.llm_answers enable row level security;
alter table public.reliability_stats enable row level security;

-- profiles: everyone can read their own row; admins can read every row.
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: admins read all" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- cohorts: any authenticated user can read (needed to check phase gates).
-- Writes are left to the admin UI later (service role or a dedicated policy).
create policy "cohorts: read all authenticated" on public.cohorts
  for select using (auth.role() = 'authenticated');

-- reason_categories: any authenticated user can read (needed for M2 forms).
create policy "reason_categories: read all authenticated" on public.reason_categories
  for select using (auth.role() = 'authenticated');

-- All other tables: RLS is enabled with no policies yet, which means "deny
-- all client access" by default. Real policies (own submissions, assigned
-- validations, admin overrides, etc.) get added when each milestone's
-- feature is built, so they're scoped to exactly what that UI needs.
