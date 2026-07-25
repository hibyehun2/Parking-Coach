create or replace function public.publish_learning_case(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user uuid := (select auth.uid());
  published_id uuid;
begin
  if request_user is null then
    raise insufficient_privilege using message = 'learning_cases login required';
  end if;

  if not (
    coalesce((select auth.jwt())->'app_metadata'->'providers', '[]'::jsonb) ? 'google'
  ) then
    raise insufficient_privilege using message = 'learning_cases google login required';
  end if;

  insert into public.learning_cases (
    owner_id,
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
  )
  values (
    request_user,
    payload->>'client_share_id',
    payload->>'nickname',
    (payload->>'completed_date')::date,
    (payload->>'consent_version')::integer,
    (payload->>'consent_accepted_at')::timestamptz,
    payload->>'scenario_id',
    payload->>'scenario_title',
    payload->>'practice_type',
    payload->>'outcome',
    coalesce((payload->>'collision_count')::integer, 0),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(payload->'collision_zones', '[]'::jsonb))),
      '{}'::text[]
    ),
    nullif(payload->>'quiz_score', '')::integer,
    nullif(payload->>'quiz_total', '')::integer,
    coalesce(
      array(select jsonb_array_elements_text(coalesce(payload->'learning_points', '[]'::jsonb))),
      '{}'::text[]
    )
  )
  on conflict (owner_id, client_share_id)
  do update set
    nickname = excluded.nickname,
    completed_date = excluded.completed_date,
    consent_version = excluded.consent_version,
    consent_accepted_at = excluded.consent_accepted_at,
    scenario_id = excluded.scenario_id,
    scenario_title = excluded.scenario_title,
    practice_type = excluded.practice_type,
    outcome = excluded.outcome,
    collision_count = excluded.collision_count,
    collision_zones = excluded.collision_zones,
    quiz_score = excluded.quiz_score,
    quiz_total = excluded.quiz_total,
    learning_points = excluded.learning_points
  returning id into published_id;

  return published_id;
end;
$$;

revoke all on function public.publish_learning_case(jsonb) from public;
revoke all on function public.publish_learning_case(jsonb) from anon;
grant execute on function public.publish_learning_case(jsonb) to authenticated;
