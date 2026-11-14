alter table public.submissions
    add column if not exists hypothesis_type text check (hypothesis_type in ('A', 'B', 'C'));

alter table public.cohorts
    add column if not exists results_released_at timestamptz;

alter table public.validations
    add column if not exists filled_by_admin boolean not null default false;

-- atomic submit, now with the hypothesis type
drop function if exists public.save_submission(uuid, text, text, jsonb);

create or replace function public.save_submission(
  p_submission_id uuid,
  p_type text,
  p_h0 text,
  p_h1 text,
  p_items jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
v_owner  uuid;
  v_closed timestamptz;
  item     jsonb;
  i        int := 0;
begin
select s.user_id, c.m1_closed_at
into v_owner, v_closed
from public.submissions s
         join public.cohorts c on c.id = s.cohort_id
where s.id = p_submission_id;

if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not_allowed';
end if;
  if v_closed is not null then
    raise exception 'locked';
end if;
  if p_type not in ('A', 'B', 'C') then
    raise exception 'bad_type';
end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then
    raise exception 'bad_items';
end if;

update public.submissions
set hypothesis_type = p_type,
    hypothesis_null = p_h0,
    hypothesis_alt  = p_h1,
    submitted_at    = now()
where id = p_submission_id;

delete from public.questions where submission_id = p_submission_id;

for item in select * from jsonb_array_elements(p_items) loop
    insert into public.questions (submission_id, prompt, category, source_url, order_index)
            values (
                p_submission_id,
                item->>'prompt',
                case when p_type = 'C' then nullif(trim(item->>'category'), '') else null end,
                item->>'source_url',
                i
                );
i := i + 1;
end loop;
end;
$$;

grant execute on function public.save_submission(uuid, text, text, text, jsonb) to authenticated;

-- what a student may download once results are released: only their own items,
-- evaluators anonymised (V1, V2, ...), staff-filled rows labelled "Staff"
create or replace function public.my_released_results(p_cohort_id uuid)
returns table (
  item_number int,
  source_url text,
  prompt text,
  category text,
  evaluator text,
  verdict text,
  rating int
)
language sql
stable
security definer
set search_path = public
as $$
select
    (q.order_index + 1)::int,
    q.source_url,
    q.prompt,
    q.category,
    case
        when v.id is null then null
        when v.filled_by_admin then 'Staff'
        else 'V' || (row_number() over (partition by q.id order by v.filled_by_admin, v.id))::text
        end,
    v.verdict,
    v.rating::int
from public.questions q
         join public.submissions s on s.id = q.submission_id
         join public.cohorts c on c.id = s.cohort_id
         left join public.validations v on v.question_id = q.id
where s.user_id = auth.uid()
  and s.cohort_id = p_cohort_id
  and c.results_released_at is not null
order by q.order_index, 5;
$$;

revoke all on function public.my_released_results(uuid) from public;
grant execute on function public.my_released_results(uuid) to authenticated;