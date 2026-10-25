-- NEURA: consulta el estado de las últimas canciones
SELECT id, title, artist, status, created_at
FROM public.tracks
ORDER BY created_at DESC
LIMIT 30;

-- Para publicar UNA canción revisada, sustituye el UUID por el id real.
-- Ejecutar solo desde el SQL Editor como administrador.
-- UPDATE public.tracks SET status = 'published' WHERE id = 'UUID-DE-LA-CANCION' AND status = 'pending';
