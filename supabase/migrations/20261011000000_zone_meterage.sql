-- ORMEN Atelier: fabric metres per zone (meeting of 10 Oct, decision 5).
-- The firm's upholsterer can split a model's metres over kasa, kollar, oturak
-- and sırt ("oturak 2,5 m, kasa 6 m"), for the same fabric width as the
-- whole figure. With it, the cutter's sheet can give metres for a piece in
-- more than one fabric too; without it, those rows still say "usta hesaplar".
-- A zone left out is one the model does not have. Run after the earlier migrations.

alter table public.models
  add column if not exists meterage_zones jsonb
  check (
    meterage_zones is null
    or (
      jsonb_typeof(meterage_zones) = 'object'
      and meterage_zones - array['govde', 'kol', 'oturak', 'sirt'] = '{}'::jsonb
    )
  );
