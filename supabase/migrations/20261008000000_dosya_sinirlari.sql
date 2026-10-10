-- ORMEN Atelier: limits on the file bucket itself, so even a signed upload
-- cannot store something else or something huge (the app checks the same).
-- Run after the earlier migrations.

update storage.buckets
set file_size_limit = 62914560, -- 60 MB (largest allowed .glb)
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'model/gltf-binary', 'application/octet-stream']
where id = 'atelier';
