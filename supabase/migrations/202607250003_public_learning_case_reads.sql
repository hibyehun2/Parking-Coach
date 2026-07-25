drop policy if exists "public can read learning cases" on public.learning_cases;
drop policy if exists "users read their own learning cases" on public.learning_cases;

create policy "public can read learning cases"
on public.learning_cases for select
to anon, authenticated
using (true);

revoke select (owner_id, client_share_id) on public.learning_cases from authenticated;
