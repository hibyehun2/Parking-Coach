create table if not exists public.practice_sessions (
  id text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_at timestamptz not null,
  scenario_id text not null,
  mode text not null check (mode in ('learning', 'practice')),
  success boolean not null,
  collision_count integer not null default 0,
  collision_targets text[] not null default '{}',
  collision_zones text[] not null default '{}',
  mistakes text[] not null default '{}',
  seed integer,
  variant text,
  runtime jsonb,
  moments jsonb,
  quiz_score integer,
  quiz_total integer,
  correction_attempts jsonb,
  bookmarked boolean not null default false,
  bookmarked_at timestamptz,
  share_status text not null default 'private',
  share_client_id text,
  share_requested_at timestamptz,
  public_case_id text,
  share_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;

drop policy if exists "users read their own practice sessions" on public.practice_sessions;
create policy "users read their own practice sessions"
on public.practice_sessions for select
to authenticated
using (
  owner_id = (select auth.uid())
);

drop policy if exists "users insert their own practice sessions" on public.practice_sessions;
create policy "users insert their own practice sessions"
on public.practice_sessions for insert
to authenticated
with check (
  owner_id = (select auth.uid())
);

drop policy if exists "users update their own practice sessions" on public.practice_sessions;
create policy "users update their own practice sessions"
on public.practice_sessions for update
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);

drop policy if exists "users delete their own practice sessions" on public.practice_sessions;
create policy "users delete their own practice sessions"
on public.practice_sessions for delete
to authenticated
using (
  owner_id = (select auth.uid())
);

create or replace function public.set_practice_sessions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_practice_sessions_updated_at on public.practice_sessions;
create trigger set_practice_sessions_updated_at
before update on public.practice_sessions
for each row execute function public.set_practice_sessions_updated_at();

revoke all on table public.practice_sessions from anon;
revoke all on table public.practice_sessions from authenticated;
grant select, insert, update, delete on table public.practice_sessions to authenticated;
