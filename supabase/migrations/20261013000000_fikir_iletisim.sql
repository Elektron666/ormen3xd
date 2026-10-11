-- ORMEN Atelier: "Bize fikir verin" (11 Oct). A visitor who wants an answer
-- may leave a firm name, their name and phone, with consent; otherwise the
-- message stays anonymous. Name and phone come together or not at all.
-- Run after the earlier migrations.

alter table public.feedback
  add column if not exists contact_company text check (contact_company is null or char_length(contact_company) between 1 and 80),
  add column if not exists contact_name text check (contact_name is null or char_length(contact_name) between 2 and 80),
  add column if not exists contact_phone text check (contact_phone is null or contact_phone ~ '^\+90[2-5][0-9]{9}$'),
  add column if not exists contact_consent_at timestamptz;

alter table public.feedback drop constraint if exists feedback_contact_complete;
alter table public.feedback add constraint feedback_contact_complete check (
  (contact_name is null and contact_phone is null and contact_company is null and contact_consent_at is null)
  or (contact_name is not null and contact_phone is not null and contact_consent_at is not null)
);
