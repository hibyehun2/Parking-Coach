alter table public.learning_cases
  drop constraint if exists learning_cases_collision_zones_allowed,
  add constraint learning_cases_collision_zones_allowed
    check (collision_zones <@ array['front-left', 'front-right', 'rear-left', 'rear-right']::text[]),
  drop constraint if exists learning_cases_learning_points_size,
  add constraint learning_cases_learning_points_size
    check (cardinality(learning_points) <= 5 and char_length(array_to_string(learning_points, '')) <= 1000);

drop policy if exists "learning cases are publicly readable" on public.learning_cases;
drop policy if exists "public can read learning cases" on public.learning_cases;
create policy "public can read learning cases"
on public.learning_cases for select
to anon
using (true);

drop policy if exists "users read their own learning cases" on public.learning_cases;
create policy "users read their own learning cases"
on public.learning_cases for select
to authenticated
using (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
);

drop policy if exists "users publish their own learning cases" on public.learning_cases;
create policy "users publish their own learning cases"
on public.learning_cases for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
);

drop policy if exists "users update their own learning cases" on public.learning_cases;
create policy "users update their own learning cases"
on public.learning_cases for update
to authenticated
using (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
)
with check (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
);

drop policy if exists "users delete their own learning cases" on public.learning_cases;
create policy "users delete their own learning cases"
on public.learning_cases for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
);

create or replace function public.enforce_learning_case_owner_and_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user uuid := (select auth.uid());
begin
  if request_user is null or new.owner_id <> request_user then
    raise insufficient_privilege using message = 'learning_cases owner mismatch';
  end if;
  if not exists (
    select 1
    from public.learning_cases
    where owner_id = request_user and client_share_id = new.client_share_id
  ) and (
    select count(*)
    from public.learning_cases
    where owner_id = request_user
  ) >= 3 then
    raise check_violation using message = 'learning_cases limit exceeded';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_learning_case_owner_and_limit() from public;

drop trigger if exists enforce_learning_case_owner_and_limit on public.learning_cases;
create trigger enforce_learning_case_owner_and_limit
before insert on public.learning_cases
for each row execute function public.enforce_learning_case_owner_and_limit();

revoke all on table public.learning_cases from anon;
revoke all on table public.learning_cases from authenticated;
grant select (
  id,
  nickname,
  completed_date,
  scenario_id,
  scenario_title,
  practice_type,
  outcome,
  collision_count,
  collision_zones,
  quiz_score,
  quiz_total,
  learning_points,
  created_at
) on table public.learning_cases to anon, authenticated;
grant select (owner_id, client_share_id) on table public.learning_cases to authenticated;
grant insert (
  client_share_id,
  nickname,
  completed_date,
  consent_version,
  consent_accepted_at,
  scenario_id,
  scenario_title,
  practice_type,
  outcome,
  collision_count,
  collision_zones,
  quiz_score,
  quiz_total,
  learning_points
) on table public.learning_cases to authenticated;
grant update (
  client_share_id,
  nickname,
  completed_date,
  consent_version,
  consent_accepted_at,
  scenario_id,
  scenario_title,
  practice_type,
  outcome,
  collision_count,
  collision_zones,
  quiz_score,
  quiz_total,
  learning_points
) on table public.learning_cases to authenticated;
grant delete on table public.learning_cases to authenticated;
