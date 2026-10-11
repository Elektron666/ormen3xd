-- ORMEN Atelier: visitor feedback ("Geri bildirim gönder", 11 Oct).
-- Nothing personal: no name, phone, IP or user agent. Written only by the
-- server (secret key); read in the panel by ORMEN staff. Run after the earlier migrations.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('begendim', 'oneri', 'hata', 'diger')),
  message text not null check (char_length(message) between 3 and 1000),
  page text check (page ~ '^/[A-Za-z0-9/_-]{0,120}$'),
  firm_slug text check (firm_slug ~ '^[a-z0-9-]{1,60}$'),
  device text check (device in ('telefon', 'tablet', 'masaustu')),
  created_at timestamptz not null default now()
);
create index if not exists feedback_created on public.feedback (created_at desc);
alter table public.feedback enable row level security;
drop policy if exists "staff reads feedback" on public.feedback;
create policy "staff reads feedback" on public.feedback for select using (public.is_staff());
drop policy if exists "staff deletes feedback" on public.feedback;
create policy "staff deletes feedback" on public.feedback for delete using (public.is_staff());
