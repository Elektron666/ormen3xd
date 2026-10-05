-- ORMEN Atelier: the panel report computed in the database (Faz 2).
-- Same result as lib/events.ts buildReport, without moving every event to
-- the app (the app-side version was capped at 50 000 events).
--
-- p_scope: null = every page, '' = ORMEN's own pages, otherwise a firm slug.
-- Days are Istanbul days. Run after the earlier migrations.

create or replace function public.atelier_report(p_from timestamptz, p_to timestamptz, p_scope text default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with e as (
    select *
    from events
    where created_at >= p_from
      and created_at <= p_to
      and (p_scope is null or (p_scope = '' and firm_slug is null) or firm_slug = p_scope)
  ),
  counts as (
    select type, count(*) as n from e group by type
  ),
  first_device as (
    select distinct on (session_id) device from e where device is not null order by session_id, created_at
  ),
  top_fabrics as (
    select fabric_code as code, count(*) as tries, count(distinct session_id) as sessions
    from e
    where type = 'kumas_denendi' and fabric_code is not null
    group by fabric_code
    order by tries desc, fabric_code
    limit 10
  ),
  firms as (
    select firm_slug as slug,
           count(distinct session_id) as sessions,
           count(*) filter (where type = 'kumas_denendi') as tries,
           count(*) filter (where type = 'ar_acildi') as ar,
           count(*) filter (where type = 'paylasildi') as shares,
           count(*) filter (where type = 'numune_istendi') as samples
    from e
    group by firm_slug
  ),
  days as (
    select d::date as day,
           (select count(distinct session_id) from e where (e.created_at at time zone 'Europe/Istanbul')::date = d::date) as sessions
    from generate_series((p_from at time zone 'Europe/Istanbul')::date, (p_to at time zone 'Europe/Istanbul')::date, interval '1 day') as d
  )
  select jsonb_build_object(
    'sessions', (select count(distinct session_id) from e),
    'counts', coalesce((select jsonb_object_agg(type, n) from counts), '{}'::jsonb),
    'devices', coalesce((select jsonb_object_agg(device, n) from (select device, count(*) as n from first_device group by device) x), '{}'::jsonb),
    'topFabrics', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'tries', tries, 'sessions', sessions) order by tries desc, code) from top_fabrics), '[]'::jsonb),
    'firms', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'sessions', sessions, 'tries', tries, 'ar', ar, 'shares', shares, 'samples', samples) order by sessions desc, slug) from firms), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'sessions', sessions) order by day) from days), '[]'::jsonb)
  );
$$;

-- only the server (service role) runs the report; Supabase grants execute to
-- anon/authenticated by default, so those are revoked explicitly
revoke all on function public.atelier_report(timestamptz, timestamptz, text) from public;
revoke all on function public.atelier_report(timestamptz, timestamptz, text) from anon, authenticated;
