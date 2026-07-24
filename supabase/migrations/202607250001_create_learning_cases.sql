create extension if not exists pgcrypto;

create table if not exists public.learning_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_share_id text not null check (char_length(client_share_id) between 16 and 100),
  nickname text not null check (char_length(nickname) between 1 and 40),
  completed_date date not null,
  consent_version integer not null check (consent_version > 0),
  consent_accepted_at timestamptz not null,
  scenario_id text not null check (scenario_id in ('both-sides', 'narrow-aisle', 'one-side', 'wall-side', 'tight-entry')),
  scenario_title text not null check (char_length(scenario_title) between 1 and 80),
  practice_type text not null check (practice_type in ('직접 연습', '판단 연습')),
  outcome text not null check (outcome in ('안전 완료', '복기 필요')),
  collision_count integer not null default 0 check (collision_count between 0 and 100),
  collision_zones text[] not null default '{}',
  quiz_score integer,
  quiz_total integer,
  learning_points text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, client_share_id),
  check (cardinality(collision_zones) <= 20),
  constraint learning_cases_collision_zones_allowed
    check (collision_zones <@ array['front-left', 'front-right', 'rear-left', 'rear-right']::text[]),
  constraint learning_cases_learning_points_size
    check (cardinality(learning_points) <= 5 and char_length(array_to_string(learning_points, '')) <= 1000),
  check (
    (quiz_score is null and quiz_total is null)
    or (
      quiz_score between 0 and quiz_total
      and quiz_total between 1 and 100
    )
  )
);

alter table public.learning_cases enable row level security;

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

create or replace function public.set_learning_case_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_learning_case_updated_at on public.learning_cases;
create trigger set_learning_case_updated_at
before update on public.learning_cases
for each row execute function public.set_learning_case_updated_at();

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
