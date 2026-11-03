-- =====================================================================
-- Return on Uni: weekly "entries to review" email to the admin
--
-- Every Monday morning (Adelaide time), emails the admin the graduate
-- entries from the past 7 days that have a reason to be checked (see
-- review_flags in schema.sql: university "Other", salaries that look
-- mistyped, placeholder text…). Nothing is hidden automatically: the admin
-- unticks show_in_database on any entry that looks fake.
--
-- Before running, once:
--   1. Run schema.sql (it has review_flags).
--   2. Resend → API Keys → Create (Sending access). Then Supabase →
--      Project Settings → Vault → Add new secret:
--        name: resend_api_key     secret: the re_… key
--   3. The admin's address is in the cron.schedule line at the bottom (change it there if needed).
-- Then paste this whole file into Supabase → SQL Editor → Run.
--
-- Send one now to test:   select public.send_review_digest('admin@example.com');
-- Review older entries:   select public.send_review_digest('admin@example.com', 365);
-- Stop the weekly email:  select cron.unschedule('weekly-entry-review');
-- =====================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.html_escape(t text)
returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- Builds the email: { flagged, total, subject, html, text } for entries from the last p_days.
create or replace function public.review_digest(p_days int default 7)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => p_days);
  total int;
  flagged int;
  rows_html text := '';
  rows_text text := '';
  r record;
  period text := case when p_days = 7 then 'this week' else 'in the last ' || p_days || ' days' end;
  editor text := 'https://supabase.com/dashboard/project/rgzostyfhlpvgoguithw/editor';
  td text := 'padding:10px 8px;border-top:1px solid #e4e7ec;vertical-align:top;font-size:13px;color:#2b3445;';
begin
  select count(*) into total from public.graduates where submitted_at >= since;
  flagged := 0;
  for r in
    select g.*, public.review_flags(g) as reasons
      from public.graduates g
     where g.submitted_at >= since and public.review_flags(g) is not null
     order by g.submitted_at
  loop
    flagged := flagged + 1;
    rows_html := rows_html || '<tr>'
      || '<td style="' || td || 'font-weight:700;">#' || r.id || '<br><span style="font-weight:400;color:#667085;">'
      || to_char(r.submitted_at at time zone 'Australia/Adelaide', 'DD Mon') || '</span></td>'
      || '<td style="' || td || '"><b>' || html_escape(r.course_name) || '</b><br>'
      || html_escape(case when r.university = 'Other' then 'Other: ' || coalesce(r.university_other, '?') else r.university end)
      || ' (' || html_escape(r.graduation_year) || ')</td>'
      || '<td style="' || td || '">' || html_escape(coalesce(r.first_role, '–')) || ' → ' || html_escape(coalesce(r."current_role", '–'))
      || '<br><span style="color:#667085;">' || coalesce('$' || to_char(r.starting_salary, 'FM999,999,999'), '–')
      || ' → ' || coalesce('$' || to_char(r.current_salary, 'FM999,999,999'), '–') || '</span></td>'
      || '<td style="' || td || 'color:#b54708;">' || html_escape(r.reasons)
      || case when not r.show_in_database then '<br><span style="color:#667085;">(already off the site)</span>' else '' end
      || '</td></tr>';
    rows_text := rows_text || '#' || r.id || '  ' || r.course_name || ', '
      || case when r.university = 'Other' then 'Other: ' || coalesce(r.university_other, '?') else r.university end
      || '  |  ' || coalesce(r.first_role, '–') || ' → ' || coalesce(r."current_role", '–')
      || '  |  ' || coalesce(r.starting_salary::text, '–') || ' → ' || coalesce(r.current_salary::text, '–')
      || '  |  ' || r.reasons || E'\n';
  end loop;

  return jsonb_build_object(
    'flagged', flagged,
    'total', total,
    'subject', case when flagged = 0 then 'Return on Uni: nothing to review ' || period
                    else 'Return on Uni: ' || flagged || ' ' || case when flagged = 1 then 'entry' else 'entries' end || ' to review ' || period end,
    'text', total || ' new graduate entries ' || period || ', ' || flagged || ' to review.' || E'\n\n' || rows_text
            || E'\nTo take an entry off the site: Supabase → Table editor → graduates → find the id → untick show_in_database.\n' || editor,
    'html',
      '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;color:#2b3445;">'
      || '<div style="font-size:18px;font-weight:800;color:#15213b;margin-bottom:16px;">Return on <span style="background:#ffe2b8;border-radius:5px;padding:1px 6px;">Uni</span></div>'
      || '<h1 style="font-size:22px;color:#15213b;margin:0 0 8px;">'
      || case when flagged = 0 then 'Nothing to review ' || period else flagged || ' ' || case when flagged = 1 then 'entry' else 'entries' end || ' to review ' || period end
      || '</h1>'
      || '<p style="margin:0 0 18px;font-size:15px;">' || total || ' new graduate ' || case when total = 1 then 'entry' else 'entries' end || ' ' || period
      || case when flagged = 0 then '. None of them stood out.' else '. These have something worth a quick look. They are still on the site until you take them off.' end || '</p>'
      || case when flagged = 0 then '' else
           '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e4e7ec;border-radius:10px;">'
           || '<tr><th align="left" style="padding:8px;font-size:12px;color:#667085;">Entry</th><th align="left" style="padding:8px;font-size:12px;color:#667085;">Course</th>'
           || '<th align="left" style="padding:8px;font-size:12px;color:#667085;">Roles and salaries</th><th align="left" style="padding:8px;font-size:12px;color:#667085;">Why</th></tr>'
           || rows_html || '</table>'
           || '<p style="margin:18px 0 0;font-size:14px;"><b>To take one off the site:</b> Supabase → Table editor → <b>graduates</b> → find the entry number (id) → untick <b>show_in_database</b>. It stays saved for analysis.</p>'
         end
      || '<p style="margin:18px 0 0;"><a href="' || editor || '" style="display:inline-block;background:#15213b;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px;font-size:14px;">Open the Supabase table editor</a></p>'
      || '<p style="margin:22px 0 0;font-size:12px;color:#667085;">Sent every Monday by the Return on Uni database. Entry emails are not included here; look them up by id in Supabase if you need to contact someone.</p>'
      || '</div>');
end $$;

-- Sends the email through Resend. Returns the request id (see net._http_response for the reply).
create or replace function public.send_review_digest(p_to text, p_days int default 7)
returns bigint language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  key text;
  d jsonb := public.review_digest(p_days);
begin
  select decrypted_secret into key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if key is null then
    raise exception 'Add the Resend API key to Vault first (name: resend_api_key).';
  end if;
  return net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'Return on Uni <noreply@returnonuni.com.au>',
      'to', jsonb_build_array(p_to),
      'subject', d ->> 'subject',
      'html', d ->> 'html',
      'text', d ->> 'text'));
end $$;

revoke execute on function public.html_escape(text), public.review_digest(int), public.send_review_digest(text, int)
  from public, anon, authenticated;

-- Every Monday 9:30am Adelaide time (Sunday 23:00 UTC; 8:30am in winter).
select cron.unschedule('weekly-entry-review') where exists (select 1 from cron.job where jobname = 'weekly-entry-review');
select cron.schedule('weekly-entry-review', '0 23 * * 0',
  $job$ select public.send_review_digest('utkarsh@myfirstaustralianoffer.com.au') $job$);
