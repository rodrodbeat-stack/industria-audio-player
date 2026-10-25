-- NEURA // Neural Audio 2050
-- Ejecuta este script en Supabase > SQL Editor.
-- Si ya ejecutaste tu supabase-schema.sql anterior, este archivo agrega solo Storage para imágenes.
-- Si aún no ejecutaste el esquema anterior, primero ejecuta el archivo supabase-schema.sql que ya tienes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de demo: permiten subir y leer imágenes sin iniciar sesión.
-- Para producción, recomendamos autenticar usuarios y limitar uploads por propietario.
drop policy if exists "community images upload" on storage.objects;
create policy "community images upload" on storage.objects
for insert to anon, authenticated with check (bucket_id = 'community-images');

drop policy if exists "community images public read" on storage.objects;
create policy "community images public read" on storage.objects
for select using (bucket_id = 'community-images');
