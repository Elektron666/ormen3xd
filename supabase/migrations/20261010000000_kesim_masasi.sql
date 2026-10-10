-- ORMEN Atelier: the "cutting table" (2nd meeting, 5 Oct): everything the
-- database needs for samples, lots and fabric metres, in one file.
--
-- Sample requests:
--   * The free-text note goes: a customer could type an address or ID number
--     there, and the brief allows only name and phone. Three fixed choices
--     replace it (none of them personal data).
--   * ORMEN sends the sample to the firm's shop, never to the customer; the
--     request moves through fixed steps and gets a short sample code (printed
--     on the label, scanned when the order comes) and the dye lot ORMEN cut it from.
-- Run after the earlier migrations.

alter table public.sample_requests drop column if exists note;

alter table public.sample_requests
  add column if not exists purpose text check (purpose in ('yeni', 'yeniden')),
  add column if not exists scope text check (scope in ('tek', 'takim')),
  add column if not exists timing text check (timing in ('yakin', 'arastiriyor'));

alter table public.sample_requests drop constraint if exists sample_requests_status_check;
update public.sample_requests set status = case status when 'iletildi' then 'gonderildi' when 'tamamlandi' then 'gonderildi' else status end;
alter table public.sample_requests add constraint sample_requests_status_check
  check (status in ('yeni', 'hazirlaniyor', 'gonderildi', 'siparis', 'donmedi'));

alter table public.sample_requests
  add column if not exists code text unique check (code ~ '^N-[0-9A-HJ-NP-Z]{6}$'),
  add column if not exists lot text check (char_length(lot) between 1 and 40),
  add column if not exists status_at timestamptz;

-- Fabrics: what the cutter needs besides the width (already there). Empty =
-- not known, and then no metres are worked out for it (nothing is invented).
--   pattern:        'duz' (plain) or 'desenli' (has a repeating pattern)
--   pattern_repeat: the repeat of a patterned fabric, width × height in cm
--   cut_direction:  'cift' (pieces may be turned) or 'tek' (pile or pattern runs one way)
alter table public.fabrics
  add column if not exists pattern text check (pattern in ('duz', 'desenli')),
  add column if not exists pattern_repeat_w_cm numeric check (pattern_repeat_w_cm > 0 and pattern_repeat_w_cm <= 300),
  add column if not exists pattern_repeat_h_cm numeric check (pattern_repeat_h_cm > 0 and pattern_repeat_h_cm <= 300),
  add column if not exists cut_direction text check (cut_direction in ('cift', 'tek'));
alter table public.fabrics add constraint fabrics_repeat_only_when_patterned
  check (pattern = 'desenli' or (pattern_repeat_w_cm is null and pattern_repeat_h_cm is null));

-- Models: the firm's own metres for one piece and the fabric width they are
-- for. Repeated on the cutter's sheet only for a plain, two-way fabric of the
-- same width (lib/metraj.ts); never calculated by us.
alter table public.models
  add column if not exists meterage_m numeric check (meterage_m >= 0.5 and meterage_m <= 60),
  add column if not exists meterage_ref_width_cm numeric check (meterage_ref_width_cm >= 100 and meterage_ref_width_cm <= 340);
alter table public.models add constraint models_meterage_complete
  check ((meterage_m is null) = (meterage_ref_width_cm is null));

-- What a job really took, written by the upholsterer from the QR on the
-- cutter's sheet. Calibration data; no personal data. Server only (no
-- policies: anon and authenticated cannot read or write it).
create table if not exists public.cut_reports (
  id bigint generated always as identity primary key,
  fabric_code text not null check (fabric_code ~ '^[A-ZÇĞİÖŞÜ0-9-]{2,24}$'),
  firm_slug text check (firm_slug ~ '^[a-z0-9-]{1,60}$'),
  model_slugs text[] not null default '{}' check (cardinality(model_slugs) <= 12),
  estimated_m numeric check (estimated_m > 0 and estimated_m <= 200),
  actual_m numeric not null check (actual_m >= 0.2 and actual_m <= 200),
  created_at timestamptz not null default now()
);
create index if not exists cut_reports_created on public.cut_reports (created_at desc);
alter table public.cut_reports enable row level security;

-- Firms: ready-made scenes for the firm's page ([{ "name": …, "id": share id }],
-- at most six; checked by the app, the database only keeps it an array).
alter table public.firms add column if not exists presets jsonb not null default '[]'::jsonb
  check (jsonb_typeof(presets) = 'array' and jsonb_array_length(presets) <= 6);
