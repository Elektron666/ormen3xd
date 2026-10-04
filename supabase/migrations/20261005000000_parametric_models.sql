-- ORMEN Atelier: parametric models (Faz 2). A model described in the panel
-- with a few choices (type, arms, back, legs, sizes) and built from code.
-- Run after 20261004000000_init.sql.

alter table public.models add column params jsonb;

alter table public.models drop constraint models_procedural_key_check;
alter table public.models
  add constraint models_procedural_key_check check (procedural_key in ('modular-sofa', 'armchair', 'parametric'));

-- a parametric model always carries its description, nothing else does
alter table public.models
  add constraint models_params_check check ((procedural_key = 'parametric') = (params is not null) or (procedural_key is null and params is null));
