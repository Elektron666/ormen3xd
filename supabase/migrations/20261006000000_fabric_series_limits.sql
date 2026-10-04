-- ORMEN Atelier: limit the fabrics offered per firm page and per model (Faz 2).
-- A list of series names; empty = every published fabric. Run after the
-- earlier migrations.

alter table public.firms add column fabric_series text[] not null default '{}';
alter table public.models add column fabric_series text[] not null default '{}';
