create policy "questions: validator read assigned" on public.questions
  for select using (
                 exists (
                 select 1 from public.validations v
                 where v.question_id = questions.id and v.validator_id = auth.uid()
                 )
                 );

create or replace function public.is_validator_of_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
    select 1
    from public.questions q
             join public.validations v on v.question_id = q.id
    where q.submission_id = p_submission_id
      and v.validator_id = auth.uid()
);
$$;

create policy "submissions: validator read assigned" on public.submissions
  for select using ( public.is_validator_of_submission(id) );