-- ORMEN Atelier: sample requests after the 5 Oct meetings.
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
