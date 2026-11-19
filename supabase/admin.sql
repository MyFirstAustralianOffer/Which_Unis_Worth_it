-- =====================================================================
-- Return on Uni: admin page (admin.html)
--
-- Run after schema.sql: Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- Everything the admin page does goes through these functions, and every one
-- of them first checks public.is_admin() (a verified email on public.admins).
-- Anyone else gets "Not found", even if they find the page or its code.
--
--   admin_overview()                 key numbers + weekly sign-ups/contributions
--   admin_entries(form, …)           list/search/filter entries (incl. emails)
--   admin_entry(form, id)            one entry in full, with its history
--   admin_update_entry(form, id, …)  edit answers (old version kept in history)
--   admin_set_visible(ids, show)     show/hide graduate cards on the site
--   admin_mark_reviewed(ids)         "Looks fine": off the review list
--   admin_delete_entries(form, ids)  delete (restorable for 30 days)
--   admin_deleted() / admin_restore(id)
--   admin_users(…) / admin_delete_user(id)
--   admin_cleanup_lists() / admin_assign_university(…) / admin_rename_course(…)
--   admin_activity()                 what was changed, by whom, when
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Deleted entries, kept for 30 days so mistakes can be undone. Then purged.
create table if not exists public.deleted_entries (
  id            bigint generated always as identity primary key,
  source_table  text not null,             -- graduates | current_students | future_students
  entry_id      bigint not null,
  user_id       uuid,
  row_data      jsonb not null,            -- the whole entry as it was
  reason        text,                      -- "deleted by admin" / "account deleted"
  deleted_by    text,
  deleted_at    timestamptz not null default now(),
  purge_after   timestamptz not null default now() + interval '30 days'
);

-- Every change made from the admin page.
create table if not exists public.admin_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  admin_email text,
  action      text not null,
  details     jsonb
);

alter table public.deleted_entries enable row level security;
alter table public.admin_log       enable row level security;
revoke all on public.deleted_entries, public.admin_log from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Stops anyone who isn't an admin. Returns the admin's email (for the log).
create or replace function public.admin_guard()
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not found'; end if;
  return (select lower(email) from auth.users where id = auth.uid());
end $$;

-- 'graduates' etc. → the form's path name used in response_history.
create or replace function public.admin_form_path(p_form text)
returns text language sql immutable as $$
  select case p_form when 'graduates' then 'graduated' when 'current_students' then 'studying'
                     when 'future_students' then 'planning' end
$$;

create or replace function public.admin_check_form(p_form text)
returns void language plpgsql immutable as $$
begin
  if p_form is null or p_form not in ('graduates', 'current_students', 'future_students') then
    raise exception 'Unknown form.';
  end if;
end $$;

create or replace function public.admin_write_log(p_admin text, p_action text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_log (admin_email, action, details) values (p_admin, p_action, p_details)
$$;

-- Graduate review state: 'pending' (flagged, not checked since last change), 'checked', or null.
create or replace function public.admin_review_state(g public.graduates)
returns text language sql stable set search_path = public as $$
  select case when public.review_flags(g) is null then null
              when g.reviewed_at is not null and g.reviewed_at >= coalesce(g.updated_at, g.submitted_at) then 'checked'
              else 'pending' end
$$;

-- One entry as JSON for the admin page, with its flags (graduates only).
create or replace function public.admin_row(p_form text, p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g public.graduates;
begin
  if p_form = 'graduates' then
    g := jsonb_populate_record(null::public.graduates, p_row);
    return p_row || jsonb_build_object('flags', public.review_flags(g), 'review', public.admin_review_state(g));
  end if;
  return p_row;
end $$;

-- ---------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  weeks jsonb;
begin
  perform public.admin_guard();
  -- last 12 weeks (Monday starts, Adelaide time): sign-ups and contributions
  select jsonb_agg(jsonb_build_object(
           'week', to_char(w, 'YYYY-MM-DD'),
           'signups', (select count(*) from auth.users u
                        where date_trunc('week', u.created_at at time zone 'Australia/Adelaide') = w),
           'graduates', (select count(*) from public.graduates t
                          where date_trunc('week', t.submitted_at at time zone 'Australia/Adelaide') = w),
           'students', (select count(*) from public.current_students t
                         where date_trunc('week', t.submitted_at at time zone 'Australia/Adelaide') = w),
           'future', (select count(*) from public.future_students t
                       where date_trunc('week', t.submitted_at at time zone 'Australia/Adelaide') = w))
         order by w)
    into weeks
    from generate_series(date_trunc('week', (now() at time zone 'Australia/Adelaide')) - interval '11 weeks',
                         date_trunc('week', (now() at time zone 'Australia/Adelaide')), interval '1 week') w;

  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'signins_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'contributed', (select count(*) from public.profiles where contributed_at is not null),
    'not_contributed', (select count(*) from public.profiles where contributed_at is null),
    'google', (select count(*) from auth.users where raw_app_meta_data ->> 'provider' = 'google'),
    'email_link', (select count(*) from auth.users where coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email'),
    'graduates', (select count(*) from public.graduates),
    'graduates_7d', (select count(*) from public.graduates where submitted_at >= now() - interval '7 days'),
    'on_site', (select count(*) from public.graduates where show_in_database and coalesce(time_to_first_job, '') <> 'Still looking'),
    'hidden', (select count(*) from public.graduates where not show_in_database),
    'still_looking', (select count(*) from public.graduates where time_to_first_job = 'Still looking'),
    'current_students', (select count(*) from public.current_students),
    'future_students', (select count(*) from public.future_students),
    'to_review', (select count(*) from public.graduates g where public.admin_review_state(g) = 'pending'),
    'deleted', (select count(*) from public.deleted_entries),
    'updated_7d', (select count(*) from public.graduates where updated_at >= now() - interval '7 days'),
    'top_unis', (select coalesce(jsonb_agg(jsonb_build_object('name', u, 'count', c) order by c desc, u), '[]'::jsonb)
                   from (select case when university = 'Other' then 'Other: ' || coalesce(university_other, '?') else university end u,
                                count(*) c
                           from public.graduates group by 1 order by 2 desc, 1 limit 8) x),
    'weeks', coalesce(weeks, '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- Entries
-- ---------------------------------------------------------------------

-- p_filter: all | review (flagged, not yet checked) | hidden | still_looking | other_uni | updated
create or replace function public.admin_entries(
  p_form text default 'graduates', p_search text default null, p_filter text default 'all',
  p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
  cond text := 'true';
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.admin_guard();
  perform public.admin_check_form(p_form);

  if p_filter = 'review' and p_form = 'graduates' then
    cond := 'public.admin_review_state(t) = ''pending''';
  elsif p_filter = 'hidden' and p_form = 'graduates' then
    cond := 'not t.show_in_database';
  elsif p_filter = 'still_looking' and p_form = 'graduates' then
    cond := 't.time_to_first_job = ''Still looking''';
  elsif p_filter = 'updated' then
    cond := 't.updated_at is not null';
  elsif p_filter = 'other_uni' then
    cond := case when p_form = 'future_students'
                 then '''Other'' in (t.university_choice_1, t.university_choice_2, t.university_choice_3)'
                 else 't.university = ''Other''' end;
  end if;

  execute format($q$
    with matched as (
      select t.* from public.%1$I t
       where %2$s and ($1::text is null or to_jsonb(t)::text ilike '%%' || $1 || '%%')
    )
    select jsonb_build_object(
      'total', (select count(*) from matched),
      'rows', coalesce((
        select jsonb_agg(public.admin_row(%3$L, to_jsonb(m)) order by coalesce(m.updated_at, m.submitted_at) desc)
          from (select * from matched order by coalesce(updated_at, submitted_at) desc
                limit least(greatest($2, 1), 5000) offset greatest($3, 0)) m), '[]'::jsonb))
  $q$, p_form, cond, p_form)
  into result using q, p_limit, p_offset;
  return result;
end $$;

-- One entry in full, plus its earlier versions.
create or replace function public.admin_entry(p_form text, p_id bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  perform public.admin_guard();
  perform public.admin_check_form(p_form);
  execute format('select to_jsonb(t) from public.%I t where t.id = $1', p_form) into r using p_id;
  if r is null then raise exception 'That entry no longer exists.'; end if;
  return jsonb_build_object(
    'entry', public.admin_row(p_form, r),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('changed_at', h.changed_at, 'previous', h.previous) order by h.changed_at desc)
        from public.response_history h
       where h.path = public.admin_form_path(p_form) and (h.previous ->> 'id')::bigint = p_id), '[]'::jsonb));
end $$;

-- Edits answers. p_changes: { column: new value, … }. The old version goes to response_history.
create or replace function public.admin_update_entry(p_form text, p_id bigint, p_changes jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  old jsonb;
  allowed text[];
  cols text;
  changes jsonb;
begin
  perform public.admin_check_form(p_form);
  execute format('select to_jsonb(t) from public.%I t where t.id = $1', p_form) into old using p_id;
  if old is null then raise exception 'That entry no longer exists.'; end if;

  -- Editable: every answer column (not id, account, email or dates).
  select array_agg(column_name::text) into allowed
    from information_schema.columns
   where table_schema = 'public' and table_name = p_form
     and column_name not in ('id', 'user_id', 'email', 'submitted_at', 'updated_at', 'reviewed_at');
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into changes
    from jsonb_each(coalesce(p_changes, '{}'::jsonb)) where key = any(allowed);
  if changes = '{}'::jsonb then return jsonb_build_object('ok', true, 'changed', 0); end if;

  insert into public.response_history (user_id, path, previous)
  values ((old ->> 'user_id')::uuid, public.admin_form_path(p_form), old);

  select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(changes) k;
  execute format('update public.%1$I t set (%2$s) = (select %2$s from jsonb_populate_record(null::public.%1$I, $1)) where t.id = $2',
                 p_form, cols)
    using old || changes, p_id;

  perform public.admin_write_log(admin, 'edit entry',
    jsonb_build_object('form', p_form, 'id', p_id, 'changes', changes,
                       'before', (select jsonb_object_agg(k, old -> k) from jsonb_object_keys(changes) k)));
  return jsonb_build_object('ok', true, 'changed', (select count(*) from jsonb_object_keys(changes)));
end $$;

create or replace function public.admin_set_visible(p_ids bigint[], p_show boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  n int;
begin
  update public.graduates set show_in_database = p_show,
         reviewed_at = case when p_show then reviewed_at else now() end
   where id = any(p_ids) and show_in_database is distinct from p_show;
  get diagnostics n = row_count;
  perform public.admin_write_log(admin, case when p_show then 'show on site' else 'hide from site' end,
    jsonb_build_object('form', 'graduates', 'ids', to_jsonb(p_ids)));
  return jsonb_build_object('ok', true, 'changed', n);
end $$;

create or replace function public.admin_mark_reviewed(p_ids bigint[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  n int;
begin
  update public.graduates set reviewed_at = now() where id = any(p_ids);
  get diagnostics n = row_count;
  perform public.admin_write_log(admin, 'marked looks fine', jsonb_build_object('form', 'graduates', 'ids', to_jsonb(p_ids)));
  return jsonb_build_object('ok', true, 'changed', n);
end $$;

-- Moves entries to deleted_entries (restorable for 30 days), then deletes them.
create or replace function public.admin_delete_entries(p_form text, p_ids bigint[], p_reason text default 'deleted by admin')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  n int;
begin
  perform public.admin_check_form(p_form);
  execute format($q$
    with gone as (delete from public.%I t where t.id = any($1) returning t.*)
    insert into public.deleted_entries (source_table, entry_id, user_id, row_data, reason, deleted_by)
    select %L, g.id, g.user_id, to_jsonb(g), $2, $3 from gone g
  $q$, p_form, p_form) using p_ids, p_reason, admin;
  get diagnostics n = row_count;
  perform public.admin_write_log(admin, 'delete entries', jsonb_build_object('form', p_form, 'ids', to_jsonb(p_ids)));
  return jsonb_build_object('ok', true, 'deleted', n);
end $$;

create or replace function public.admin_deleted()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', d.id, 'form', d.source_table, 'entry_id', d.entry_id, 'reason', d.reason,
             'deleted_by', d.deleted_by, 'deleted_at', d.deleted_at, 'purge_after', d.purge_after,
             'email', d.row_data ->> 'email', 'course_name', d.row_data ->> 'course_name',
             'university', coalesce(d.row_data ->> 'university', d.row_data ->> 'university_choice_1'),
             'university_other', d.row_data ->> 'university_other')
           order by d.deleted_at desc)
      from public.deleted_entries d), '[]'::jsonb);
end $$;

create or replace function public.admin_restore(p_deleted_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  d public.deleted_entries;
  r jsonb;
begin
  select * into d from public.deleted_entries where id = p_deleted_id;
  if d.id is null then raise exception 'Nothing to restore: it may have been purged already.'; end if;
  r := d.row_data;
  -- If the account was deleted, the entry comes back without an account link.
  if d.user_id is not null and not exists (select 1 from auth.users where id = d.user_id) then
    r := r || jsonb_build_object('user_id', null);
  end if;
  begin
    execute format('insert into public.%1$I overriding system value select * from jsonb_populate_record(null::public.%1$I, $1)',
                   d.source_table) using r;
  exception when unique_violation then
    raise exception 'This person has shared a new entry since. Delete that one first if you want this one back.';
  end;
  delete from public.deleted_entries where id = p_deleted_id;
  perform public.admin_write_log(admin, 'restore entry', jsonb_build_object('form', d.source_table, 'id', d.entry_id));
  return jsonb_build_object('ok', true);
end $$;

-- Purges deleted entries older than 30 days (runs daily, see the bottom of this file).
create or replace function public.purge_deleted_entries()
returns int language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  delete from public.deleted_entries where purge_after < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------

-- p_filter: all | contributed | not_contributed
create or replace function public.admin_users(p_search text default null, p_filter text default 'all',
                                              p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.admin_guard();
  return (
    with list as (
      select u.id, lower(u.email) as email, p.full_name as name,
             coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider,
             u.created_at as joined, u.last_sign_in_at as last_sign_in, p.contributed_at,
             (select id from public.graduates where user_id = u.id) as graduate_id,
             (select id from public.current_students where user_id = u.id) as student_id,
             (select id from public.future_students where user_id = u.id) as future_id
        from auth.users u left join public.profiles p on p.id = u.id
       where (q is null or u.email ilike '%' || q || '%' or p.full_name ilike '%' || q || '%')
         and (p_filter = 'all' or (p_filter = 'contributed') = (p.contributed_at is not null))
    )
    select jsonb_build_object(
      'total', (select count(*) from list),
      'rows', coalesce((select jsonb_agg(to_jsonb(l) order by l.joined desc)
                          from (select * from list order by joined desc
                                limit least(greatest(p_limit, 1), 1000) offset greatest(p_offset, 0)) l), '[]'::jsonb)));
end $$;

-- Deletes an account: its entries go to deleted_entries (restorable for 30 days,
-- without the account), its history and profile are removed, and it can no longer sign in.
create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public, auth as $$
declare
  admin text := public.admin_guard();
  target text;
  f text;
begin
  select lower(email) into target from auth.users where id = p_user_id;
  if target is null then raise exception 'That account no longer exists.'; end if;
  if exists (select 1 from public.admins where email = target) then
    raise exception 'Admin accounts can''t be deleted here.';
  end if;
  foreach f in array array['graduates', 'current_students', 'future_students'] loop
    execute format($q$
      with gone as (delete from public.%I t where t.user_id = $1 returning t.*)
      insert into public.deleted_entries (source_table, entry_id, user_id, row_data, reason, deleted_by)
      select %L, g.id, g.user_id, to_jsonb(g), 'account deleted', $2 from gone g
    $q$, f, f) using p_user_id, admin;
  end loop;
  delete from public.response_history where user_id = p_user_id;
  delete from auth.users where id = p_user_id;   -- profile goes with it
  perform public.admin_write_log(admin, 'delete account', jsonb_build_object('email', target));
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Clean-up: "Other" universities and course names typed by hand
-- ---------------------------------------------------------------------

create or replace function public.admin_cleanup_lists()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'other_unis', coalesce((
      select jsonb_agg(jsonb_build_object('value', v, 'count', c) order by c desc, v)
        from (select btrim(university_other) v, count(*) c from (
                select university_other from public.graduates where university = 'Other'
                union all select university_other from public.current_students where university = 'Other'
                union all select university_other from public.future_students
                 where 'Other' in (university_choice_1, university_choice_2, university_choice_3)) x
               where nullif(btrim(university_other), '') is not null group by 1) y), '[]'::jsonb),
    'typed_courses', coalesce((
      select jsonb_agg(jsonb_build_object('value', v, 'count', c) order by c desc, v)
        from (select course_name v, count(*) c from (
                select course_name from public.graduates where not coalesce(course_from_list, false)
                union all select course_name from public.current_students where not coalesce(course_from_list, false)
                union all select course_name from public.future_students where not coalesce(course_from_list, false)) x
               where course_name is not null group by 1) y), '[]'::jsonb));
end $$;

-- Every entry with university "Other" and one of these typed names moves to p_university.
create or replace function public.admin_assign_university(p_values text[], p_university text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  vals text[] := (select array_agg(lower(btrim(v))) from unnest(p_values) v);
  n int := 0;
  m int;
begin
  if nullif(btrim(p_university), '') is null or p_university = 'Other' then raise exception 'Choose a university.'; end if;
  update public.graduates set university = p_university, university_other = null
   where university = 'Other' and lower(btrim(university_other)) = any(vals);
  get diagnostics m = row_count; n := n + m;
  update public.current_students set university = p_university, university_other = null
   where university = 'Other' and lower(btrim(university_other)) = any(vals);
  get diagnostics m = row_count; n := n + m;
  update public.future_students
     set university_choice_1 = case when university_choice_1 = 'Other' then p_university else university_choice_1 end,
         university_choice_2 = case when university_choice_2 = 'Other' then p_university else university_choice_2 end,
         university_choice_3 = case when university_choice_3 = 'Other' then p_university else university_choice_3 end,
         university_other = null
   where lower(btrim(university_other)) = any(vals);
  get diagnostics m = row_count; n := n + m;
  perform public.admin_write_log(admin, 'assign university',
    jsonb_build_object('from', to_jsonb(p_values), 'to', p_university, 'entries', n));
  return jsonb_build_object('ok', true, 'changed', n);
end $$;

-- Renames typed course names across all forms (e.g. three spellings → one title).
create or replace function public.admin_rename_course(p_values text[], p_new_name text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  admin text := public.admin_guard();
  name text := public.tidy_text(p_new_name);
  n int := 0;
  m int;
  f text;
begin
  if name is null then raise exception 'Type the course name to use.'; end if;
  foreach f in array array['graduates', 'current_students', 'future_students'] loop
    execute format('update public.%I set course_name = $1 where course_name = any($2) and course_name <> $1', f)
      using name, p_values;
    get diagnostics m = row_count; n := n + m;
  end loop;
  perform public.admin_write_log(admin, 'rename course',
    jsonb_build_object('from', to_jsonb(p_values), 'to', name, 'entries', n));
  return jsonb_build_object('ok', true, 'changed', n);
end $$;

create or replace function public.admin_activity(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.at desc)
                     from (select * from public.admin_log order by at desc limit least(greatest(p_limit, 1), 500)) l),
                  '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Permissions: only signed-in people can call these, and each checks is_admin().
-- ---------------------------------------------------------------------
revoke execute on function
  public.admin_guard(), public.admin_form_path(text), public.admin_check_form(text),
  public.admin_write_log(text, text, jsonb), public.admin_review_state(public.graduates),
  public.admin_row(text, jsonb), public.purge_deleted_entries(),
  public.admin_overview(), public.admin_entries(text, text, text, int, int), public.admin_entry(text, bigint),
  public.admin_update_entry(text, bigint, jsonb), public.admin_set_visible(bigint[], boolean),
  public.admin_mark_reviewed(bigint[]), public.admin_delete_entries(text, bigint[], text),
  public.admin_deleted(), public.admin_restore(bigint), public.admin_users(text, text, int, int),
  public.admin_delete_user(uuid), public.admin_cleanup_lists(), public.admin_assign_university(text[], text),
  public.admin_rename_course(text[], text), public.admin_activity(int)
from public, anon, authenticated;

-- Admin page functions (supabase/admin.sql): signed-in people may call them, and each one
-- checks is_admin() itself. Re-granted here so running this file again never locks the admin out.
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'admin\_%'
       and p.proname not in ('admin_guard', 'admin_form_path', 'admin_check_form', 'admin_write_log',
                             'admin_review_state', 'admin_row')
  loop
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Daily at 3:30am Adelaide (17:00 UTC): purge deleted entries older than 30 days.
create extension if not exists pg_cron;
select cron.unschedule('purge-deleted-entries') where exists (select 1 from cron.job where jobname = 'purge-deleted-entries');
select cron.schedule('purge-deleted-entries', '0 17 * * *', $job$ select public.purge_deleted_entries() $job$);
