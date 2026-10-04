-- ORMEN Atelier: initial schema.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to run once on
-- a fresh project. Row level security is on for every table.

-- ------------------------------------------------------------------ helpers

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- true when the signed-in user is an ORMEN panel user
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------ catalogue

create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-ZÇĞİÖŞÜ0-9-]{2,24}$'),
  series text not null,
  color_name text not null,
  color_family text not null check (color_family in (
    'beyaz-krem', 'bej-kum', 'kahve', 'gri', 'antrasit-siyah', 'yesil', 'mavi',
    'kirmizi-bordo', 'sari-hardal', 'turuncu-kiremit', 'pembe', 'mor')),
  type text not null check (type in ('bukle', 'dokuma', 'nubuk', 'kadife', 'sonil', 'keten-gorunumlu', 'jakar')),
  composition text,
  width_cm numeric check (width_cm > 0),
  weight_gsm numeric check (weight_gsm > 0),
  martindale integer check (martindale > 0),
  fire_rating text,
  description text,
  is_active boolean not null default true,
  is_placeholder boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger fabrics_touch before update on public.fabrics for each row execute function public.touch_updated_at();

create table public.fabric_textures (
  fabric_id uuid primary key references public.fabrics (id) on delete cascade,
  albedo_1k text not null,
  albedo_2k text not null,
  normal_1k text,
  normal_2k text,
  roughness_1k text,
  roughness_2k text,
  thumb text not null,
  repeat_w_cm numeric not null check (repeat_w_cm > 0),
  repeat_h_cm numeric not null check (repeat_h_cm > 0),
  sheen numeric check (sheen between 0 and 1),
  sheen_roughness numeric check (sheen_roughness between 0 and 1),
  avg_color text not null check (avg_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- normal/roughness were estimated from the colour photo, not shot separately
  derived_maps boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger fabric_textures_touch before update on public.fabric_textures for each row execute function public.touch_updated_at();

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  logo_path text,
  accent_color text not null default '#B08D57' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  whatsapp text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger firms_touch before update on public.firms for each row execute function public.touch_updated_at();

create table public.models (
  id uuid primary key default gen_random_uuid(),
  -- null: ORMEN's own showcase model
  firm_id uuid references public.firms (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  glb_path text,
  procedural_key text check (procedural_key in ('modular-sofa', 'armchair')),
  fabric_material_names text[] not null default '{}',
  width_cm numeric not null check (width_cm > 0),
  depth_cm numeric not null check (depth_cm > 0),
  height_cm numeric not null check (height_cm > 0),
  default_fabric_code text references public.fabrics (code) on update cascade on delete set null,
  cover_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (glb_path is not null or procedural_key is not null)
);
create unique index models_slug_per_owner on public.models (coalesce(firm_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create trigger models_touch before update on public.models for each row execute function public.touch_updated_at();

-- Phase 2: several models per firm, and per-model fabric lists (empty = all fabrics)
create table public.firm_models (
  firm_id uuid not null references public.firms (id) on delete cascade,
  model_id uuid not null references public.models (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (firm_id, model_id)
);

create table public.model_fabrics (
  model_id uuid not null references public.models (id) on delete cascade,
  fabric_id uuid not null references public.fabrics (id) on delete cascade,
  primary key (model_id, fabric_id)
);

-- Room presets live in code today; this table lets ORMEN add more later.
create table public.scenes (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  spec jsonb not null,
  ambient numeric not null default 1,
  hdri_path text,
  camera jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- Optional short ids for share links (links also work without this table).
create table public.shares (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{6,16}$'),
  payload text not null,
  firm_id uuid references public.firms (id) on delete set null,
  image_path text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ leads and usage

create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms (id) on delete set null,
  firm_slug text,
  fabric_codes text[] not null check (cardinality(fabric_codes) between 1 and 10),
  model_slugs text[] not null default '{}',
  -- the only personal data in the product
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^\+90[2-5][0-9]{9}$'),
  note text check (char_length(note) <= 500),
  link text check (char_length(link) <= 2000),
  status text not null default 'yeni' check (status in ('yeni', 'iletildi', 'tamamlandi')),
  created_at timestamptz not null default now()
);
create index sample_requests_created on public.sample_requests (created_at desc);

-- Anonymous usage: no IP, no user agent, no personal data.
create table public.events (
  id bigint generated always as identity primary key,
  type text not null check (type in ('sayfa_acildi', 'kumas_denendi', 'oda_degisti', 'ar_acildi', 'paylasildi', 'numune_istendi')),
  firm_id uuid references public.firms (id) on delete set null,
  firm_slug text,
  model_slug text,
  fabric_code text,
  session_id text not null check (char_length(session_id) between 8 and 64),
  device text check (device in ('telefon', 'tablet', 'masaustu')),
  created_at timestamptz not null default now()
);
create index events_created on public.events (created_at desc);
create index events_fabric on public.events (fabric_code, created_at desc);
create index events_firm on public.events (firm_slug, created_at desc);

-- ------------------------------------------------------------------ row level security
-- The website reads the public catalogue with the anon key. Everything else
-- (panel writes, sample requests, events) goes through the server, which
-- checks the panel session and uses the service role.

alter table public.profiles enable row level security;
alter table public.fabrics enable row level security;
alter table public.fabric_textures enable row level security;
alter table public.firms enable row level security;
alter table public.models enable row level security;
alter table public.firm_models enable row level security;
alter table public.model_fabrics enable row level security;
alter table public.scenes enable row level security;
alter table public.shares enable row level security;
alter table public.sample_requests enable row level security;
alter table public.events enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid());

create policy "public reads active fabrics" on public.fabrics for select using (is_active or public.is_staff());
create policy "staff writes fabrics" on public.fabrics for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads textures of active fabrics" on public.fabric_textures for select
  using (exists (select 1 from public.fabrics f where f.id = fabric_id and (f.is_active or public.is_staff())));
create policy "staff writes textures" on public.fabric_textures for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads active firms" on public.firms for select using (is_active or public.is_staff());
create policy "staff writes firms" on public.firms for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads active models" on public.models for select using (is_active or public.is_staff());
create policy "staff writes models" on public.models for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads firm models" on public.firm_models for select using (true);
create policy "staff writes firm models" on public.firm_models for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads model fabrics" on public.model_fabrics for select using (true);
create policy "staff writes model fabrics" on public.model_fabrics for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads active scenes" on public.scenes for select using (is_active or public.is_staff());
create policy "staff writes scenes" on public.scenes for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads shares" on public.shares for select using (true);

create policy "staff reads sample requests" on public.sample_requests for select using (public.is_staff());
create policy "staff updates sample requests" on public.sample_requests for update using (public.is_staff()) with check (public.is_staff());

create policy "staff reads events" on public.events for select using (public.is_staff());

-- ------------------------------------------------------------------ storage
-- One public bucket for textures, models and logos. Reads are public (the
-- configurator needs them); writes only by panel users.

insert into storage.buckets (id, name, public) values ('atelier', 'atelier', true)
  on conflict (id) do nothing;

create policy "public reads atelier files" on storage.objects for select using (bucket_id = 'atelier');
create policy "staff writes atelier files" on storage.objects for insert with check (bucket_id = 'atelier' and public.is_staff());
create policy "staff updates atelier files" on storage.objects for update using (bucket_id = 'atelier' and public.is_staff());
create policy "staff deletes atelier files" on storage.objects for delete using (bucket_id = 'atelier' and public.is_staff());
