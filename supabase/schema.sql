-- =====================================================================
-- Return on Uni: database setup for Supabase
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again: it updates functions and only creates what's missing.
--
-- What's here
--   Tables     profiles, graduates, current_students, future_students, course_names
--   Security   Row Level Security on every table. The website can't read or
--              write any table directly; it can only call the functions below.
--   Functions  my_profile()       who am I, have I contributed?
--              submit_response()  save one form (checks every answer)
--              public_entries()   database cards, for contributors only, no emails
--              filter_options()   degree types + courses for the filters
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- One row per account. Created automatically when someone first signs in.
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  full_name         text,
  created_at        timestamptz not null default now(),
  contributed_at    timestamptz,          -- set when they first submit a form
  contributed_path  text                  -- graduated | studying | planning
);

-- Form A (public as database cards, without email). One per account.
create table if not exists public.graduates (
  id                   bigint generated always as identity primary key,
  user_id              uuid unique references auth.users (id) on delete set null,
  email                text,
  submitted_at         timestamptz not null default now(),
  study_level          text,
  course_name          text,
  course_from_list     boolean,
  university           text,
  university_other     text,
  student_type         text,
  graduation_year      text,
  time_to_first_job    text,
  time_looking         text,
  first_role           text,
  starting_salary      integer,
  "current_role"       text,
  current_salary       integer,
  current_salary_same  boolean,
  show_in_database     boolean not null default true,   -- untick to hide a card
  consent_privacy      boolean,
  form_version         integer
);

-- Form B (private). One per account.
create table if not exists public.current_students (
  id                        bigint generated always as identity primary key,
  user_id                   uuid unique references auth.users (id) on delete set null,
  email                     text,
  submitted_at              timestamptz not null default now(),
  study_level               text,
  course_name               text,
  course_from_list          boolean,
  university                text,
  university_other          text,
  student_type              text,
  expected_graduation_year  text,
  job_in_field              text,
  "current_role"            text,
  hoped_role                text,
  expected_salary           integer,
  consent_privacy           boolean,
  form_version              integer
);

-- Form C (private). One per account.
create table if not exists public.future_students (
  id                   bigint generated always as identity primary key,
  user_id              uuid unique references auth.users (id) on delete set null,
  email                text,
  submitted_at         timestamptz not null default now(),
  study_level          text,
  course_name          text,
  course_from_list     boolean,
  university_choice_1  text,
  university_choice_2  text,
  university_choice_3  text,
  university_other     text,
  student_type         text,
  planned_start_year   text,
  hoped_role           text,
  expected_salary      integer,
  consent_privacy      boolean,
  form_version         integer
);

-- Course names that aren't official titles, for review.
-- Type the right title into use_instead and every matching entry (past and
-- future) shows under it.
create table if not exists public.course_names (
  name_as_saved    text primary key,      -- stored in lower case
  use_instead      text,
  times_seen       integer not null default 1,
  first_seen       timestamptz not null default now(),
  closest_official text
);

create index if not exists graduates_submitted_idx on public.graduates (submitted_at desc);
create index if not exists graduates_email_idx on public.graduates (lower(email));
create index if not exists current_students_email_idx on public.current_students (lower(email));
create index if not exists future_students_email_idx on public.future_students (lower(email));

-- ---------------------------------------------------------------------
-- Security: nothing is readable or writable directly from the website.
-- (The Supabase dashboard and Table editor still see everything.)
-- ---------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.graduates        enable row level security;
alter table public.current_students enable row level security;
alter table public.future_students  enable row level security;
alter table public.course_names     enable row level security;

revoke all on public.profiles, public.graduates, public.current_students,
              public.future_students, public.course_names from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Spacing only: "Master of  Data Science " → "Master of Data Science"
create or replace function public.tidy_text(v text, max_len int default 200)
returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(regexp_replace(coalesce(v, ''), '\s*/\s*', ' / ', 'g'), '\s+', ' ', 'g')), max_len), '')
$$;

-- A course name with any review fix applied.
create or replace function public.course_display(name text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(btrim(c.use_instead), '') from public.course_names c where c.name_as_saved = lower(btrim(name))),
    name)
$$;

-- Links rows submitted with this email (e.g. imported from the old Google Sheet)
-- to the account, and marks the account as contributed.
create or replace function public.link_existing_responses(p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  first_at timestamptz;
  first_path text;
begin
  if p_email is null or p_email = '' then return; end if;

  update public.graduates        set user_id = p_user where user_id is null and lower(email) = lower(p_email)
    and not exists (select 1 from public.graduates g where g.user_id = p_user);
  update public.current_students set user_id = p_user where user_id is null and lower(email) = lower(p_email)
    and not exists (select 1 from public.current_students s where s.user_id = p_user);
  update public.future_students  set user_id = p_user where user_id is null and lower(email) = lower(p_email)
    and not exists (select 1 from public.future_students f where f.user_id = p_user);

  select at, path into first_at, first_path from (
    select submitted_at as at, 'graduated' as path from public.graduates where user_id = p_user
    union all select submitted_at, 'studying' from public.current_students where user_id = p_user
    union all select submitted_at, 'planning' from public.future_students where user_id = p_user
  ) r order by at limit 1;

  if first_at is not null then
    update public.profiles
       set contributed_at = coalesce(contributed_at, first_at),
           contributed_path = coalesce(contributed_path, first_path)
     where id = p_user;
  end if;
end $$;

-- New account → profile, and pick up anything they submitted before accounts existed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  perform public.link_existing_responses(new.id, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Functions the website calls
-- ---------------------------------------------------------------------

-- { signed_in, email, name, contributed, path }
create or replace function public.my_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('signed_in', false); end if;
  select * into p from public.profiles where id = auth.uid();
  return jsonb_build_object(
    'signed_in', true,
    'email', p.email,
    'name', p.full_name,
    'contributed', p.contributed_at is not null,
    'path', p.contributed_path);
end $$;

-- Saves one form. p_path: graduated | studying | planning. p_answers: the form answers.
-- Errors are plain sentences the website shows as they are.
create or replace function public.submit_response(p_path text, p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  user_email text;
  a jsonb := coalesce(p_answers, '{}'::jsonb);
  required text[];
  money text[];
  k text;
  still_looking boolean;
  typed text;
  course text;
  from_list boolean;
begin
  if uid is null then raise exception 'Please sign in to share your story.'; end if;
  select lower(email) into user_email from auth.users where id = uid;

  if (a ->> 'consent_privacy') is distinct from 'true' then
    raise exception 'Please agree to the Privacy policy.';
  end if;

  still_looking := p_path = 'graduated' and a ->> 'time_to_first_job' = 'Still looking';

  if p_path = 'graduated' then
    required := array['study_level','course_name','university','student_type','graduation_year','time_to_first_job'];
    money := array[]::text[];
    if still_looking then
      required := required || array['time_looking'];
    else
      required := required || array['first_role','starting_salary','current_role','current_salary'];
      money := array['starting_salary','current_salary'];
    end if;
  elsif p_path = 'studying' then
    required := array['study_level','course_name','university','student_type','expected_graduation_year',
                      'job_in_field','current_role','hoped_role','expected_salary'];
    money := array['expected_salary'];
  elsif p_path = 'planning' then
    required := array['study_level','course_name','university_choice_1','student_type','planned_start_year',
                      'hoped_role','expected_salary'];
    money := array['expected_salary'];
  else
    raise exception 'Please choose which one you are.';
  end if;

  foreach k in array required loop
    if public.tidy_text(a ->> k) is null then
      raise exception 'Some answers are missing. Please go back and check.';
    end if;
  end loop;
  foreach k in array money loop
    if (a ->> k) !~ '^\d{1,9}$' or (a ->> k)::bigint <= 0 then
      raise exception 'Please enter salaries as a whole number.';
    end if;
  end loop;

  -- Course: saved as typed (spacing tidied), with any review fix applied.
  typed := public.tidy_text(a ->> 'course_name');
  course := public.course_display(typed);
  from_list := coalesce((a ->> 'course_from_list')::boolean, false);
  if not from_list and course = typed then
    insert into public.course_names (name_as_saved, closest_official)
    values (lower(typed), public.tidy_text(a ->> 'course_suggestion'))
    on conflict (name_as_saved) do update set times_seen = public.course_names.times_seen + 1;
  end if;

  begin
    if p_path = 'graduated' then
      insert into public.graduates (user_id, email, study_level, course_name, course_from_list, university,
        university_other, student_type, graduation_year, time_to_first_job, time_looking, first_role,
        starting_salary, "current_role", current_salary, current_salary_same, consent_privacy, form_version)
      values (uid, user_email, public.tidy_text(a ->> 'study_level'), course, from_list,
        public.tidy_text(a ->> 'university'), public.tidy_text(a ->> 'university_other'),
        public.tidy_text(a ->> 'student_type'), public.tidy_text(a ->> 'graduation_year'),
        public.tidy_text(a ->> 'time_to_first_job'),
        case when still_looking then public.tidy_text(a ->> 'time_looking') end,
        case when still_looking then null else public.tidy_text(a ->> 'first_role') end,
        case when still_looking then null else (a ->> 'starting_salary')::integer end,
        case when still_looking then null else public.tidy_text(a ->> 'current_role') end,
        case when still_looking then null else (a ->> 'current_salary')::integer end,
        case when still_looking then null else a ->> 'current_salary_same' = 'Yes' end,
        true, nullif(a ->> 'form_version', '')::integer);
    elsif p_path = 'studying' then
      insert into public.current_students (user_id, email, study_level, course_name, course_from_list, university,
        university_other, student_type, expected_graduation_year, job_in_field, "current_role", hoped_role,
        expected_salary, consent_privacy, form_version)
      values (uid, user_email, public.tidy_text(a ->> 'study_level'), course, from_list,
        public.tidy_text(a ->> 'university'), public.tidy_text(a ->> 'university_other'),
        public.tidy_text(a ->> 'student_type'), public.tidy_text(a ->> 'expected_graduation_year'),
        public.tidy_text(a ->> 'job_in_field'), public.tidy_text(a ->> 'current_role'),
        public.tidy_text(a ->> 'hoped_role'), (a ->> 'expected_salary')::integer,
        true, nullif(a ->> 'form_version', '')::integer);
    else
      insert into public.future_students (user_id, email, study_level, course_name, course_from_list,
        university_choice_1, university_choice_2, university_choice_3, university_other, student_type,
        planned_start_year, hoped_role, expected_salary, consent_privacy, form_version)
      values (uid, user_email, public.tidy_text(a ->> 'study_level'), course, from_list,
        public.tidy_text(a ->> 'university_choice_1'), public.tidy_text(a ->> 'university_choice_2'),
        public.tidy_text(a ->> 'university_choice_3'), public.tidy_text(a ->> 'university_other'),
        public.tidy_text(a ->> 'student_type'), public.tidy_text(a ->> 'planned_start_year'),
        public.tidy_text(a ->> 'hoped_role'), (a ->> 'expected_salary')::integer,
        true, nullif(a ->> 'form_version', '')::integer);
    end if;
  exception when unique_violation then
    raise exception 'You''ve already shared this story. Thank you!';
  end;

  update public.profiles
     set contributed_at = coalesce(contributed_at, now()),
         contributed_path = coalesce(contributed_path, p_path)
   where id = uid;

  return jsonb_build_object('ok', true);
end $$;

-- Database cards (newest first), only for people who have contributed.
-- Filters are optional. Never returns emails.
create or replace function public.public_entries(
  p_level text default null, p_course text default null, p_uni text default null,
  p_min_year int default null, p_type text default null,
  p_limit int default 24, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and contributed_at is not null) then
    raise exception 'locked' using hint = 'Share your story to unlock the database.';
  end if;

  with cards as (
    select g.*, public.course_display(g.course_name) as course
      from public.graduates g
     where g.show_in_database
  ), matched as (
    select * from cards c
     where (p_level  is null or c.study_level = p_level)
       and (p_course is null or lower(c.course) = lower(btrim(p_course)))
       and (p_uni    is null or c.university = p_uni)
       and (p_type   is null or c.student_type = p_type)
       and (p_min_year is null or (c.graduation_year ~ '^\d{4}$' and c.graduation_year::int >= p_min_year))
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
          'study_level', m.study_level, 'course_name', m.course, 'university', m.university,
          'university_other', m.university_other, 'graduation_year', m.graduation_year,
          'student_type', m.student_type, 'time_to_first_job', m.time_to_first_job,
          'time_looking', m.time_looking, 'first_role', m.first_role,
          'starting_salary', m.starting_salary, 'current_role', m."current_role",
          'current_salary', m.current_salary,
          'submitted', (extract(epoch from date_trunc('minute', m.submitted_at)) * 1000)::bigint)
        order by m.submitted_at desc)
        from (select * from matched order by submitted_at desc
              limit least(greatest(coalesce(p_limit, 24), 1), 100) offset greatest(coalesce(p_offset, 0), 0)) m
    ), '[]'::jsonb))
  into result;
  return result;
end $$;

-- Degree types and courses that have cards, for the filters: [{level, course}, …]
create or replace function public.filter_options()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and contributed_at is not null) then
    raise exception 'locked' using hint = 'Share your story to unlock the database.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('level', level, 'course', course) order by level, course)
      from (select distinct g.study_level as level, public.course_display(g.course_name) as course
              from public.graduates g where g.show_in_database) o
  ), '[]'::jsonb);
end $$;

-- Only signed-in people can call the website functions; helpers stay internal.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.my_profile()                       to anon, authenticated;
grant execute on function public.submit_response(text, jsonb)       to authenticated;
grant execute on function public.public_entries(text, text, text, int, text, int, int) to authenticated;
grant execute on function public.filter_options()                   to authenticated;
