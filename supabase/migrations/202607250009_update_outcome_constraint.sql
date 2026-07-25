update public.learning_cases set outcome = '안전 주차' where outcome = '안전 완료';
update public.learning_cases set outcome = '연습 완료' where outcome = '판단 완료';

alter table public.learning_cases drop constraint if exists learning_cases_outcome_check;
alter table public.learning_cases add constraint learning_cases_outcome_check check (outcome in ('안전 주차', '연습 완료', '복기 필요'));
