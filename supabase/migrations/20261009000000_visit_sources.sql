-- ORMEN Atelier: where visits come from (pilot preparation, 5 Oct 2026 meeting).
-- Adds to the anonymous events
--   source: kiosk | qr | paylasim | site | dogrudan (fixed list, set by the page)
--   tag:    a branch or campaign label ORMEN puts on a link (?e=ankara-1); never a person
--   type 'ar_acilamadi': AR could not start on the phone (decides whether the
--                        GLB must be built on the server)
-- and the two breakdowns to the report function. Still no IP, no identity.
-- Run after the earlier migrations.

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type in ('sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'ar_acilamadi', 'paylasildi', 'numune_istendi'));
alter table public.events add column if not exists source text check (source in ('kiosk', 'qr', 'paylasim', 'site', 'dogrudan'));
alter table public.events add column if not exists tag text check (tag ~ '^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$');

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
  by_source as (
    select coalesce(source, 'bilinmiyor') as key,
           count(distinct session_id) as sessions,
           count(*) filter (where type = 'numune_istendi') as samples
    from e
    group by 1
  ),
  by_tag as (
    select tag as key,
           count(distinct session_id) as sessions,
           count(*) filter (where type = 'numune_istendi') as samples
    from e
    where tag is not null
    group by 1
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
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'sessions', sessions) order by day) from days), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('source', key, 'sessions', sessions, 'samples', samples) order by sessions desc, key collate "C") from by_source), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('tag', key, 'sessions', sessions, 'samples', samples) order by sessions desc, key collate "C") from by_tag), '[]'::jsonb)
  );
$$;

-- only the server (service role) runs the report; Supabase grants execute to
-- anon/authenticated by default, so those are revoked explicitly
revoke all on function public.atelier_report(timestamptz, timestamptz, text) from public;
revoke all on function public.atelier_report(timestamptz, timestamptz, text) from anon, authenticated;
