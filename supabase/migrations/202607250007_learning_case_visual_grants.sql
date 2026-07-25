-- Fix permission issue when reading learning_cases by granting select on new columns
grant select (runtime, vehicle_snapshot) on table public.learning_cases to anon, authenticated;
