-- =============================================================================
-- SENS COACH OS — CRUD DE EJERCICIOS, FAVORITOS Y STORAGE DE MEDIA (IDEMPOTENTE)
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- No altera ni borra ninguno de los 1.376 ejercicios existentes.
-- =============================================================================

-- 1. Columnas adicionales en public.sens_exercise_library (100% retrocompatible)
ALTER TABLE public.sens_exercise_library
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Permitir ejercicios sin video/foto inicial (media opcional y editable luego)
ALTER TABLE public.sens_exercise_library
    ALTER COLUMN video_local_path SET DEFAULT '',
    ALTER COLUMN cue_technical_es SET DEFAULT '',
    ALTER COLUMN cue_technical_en SET DEFAULT '',
    ALTER COLUMN cue_technical_pt SET DEFAULT '',
    ALTER COLUMN summary_detailed_movement_es SET DEFAULT '',
    ALTER COLUMN summary_detailed_movement_en SET DEFAULT '',
    ALTER COLUMN summary_detailed_movement_pt SET DEFAULT '',
    ALTER COLUMN detailed_movement_es SET DEFAULT '',
    ALTER COLUMN detailed_movement_en SET DEFAULT '',
    ALTER COLUMN detailed_movement_pt SET DEFAULT '';

-- Índice liviano para sincronizar solo ejercicios creados/editados/favoritos al abrir el Portal
CREATE INDEX IF NOT EXISTS idx_sens_ex_custom_fav_updated
    ON public.sens_exercise_library (is_custom, is_favorite, updated_at DESC);

-- 2. Políticas RLS de escritura exclusivas para Coaches / Admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sens_exercise_library' AND policyname = 'Admins can insert sens_exercise_library'
    ) THEN
        CREATE POLICY "Admins can insert sens_exercise_library"
            ON public.sens_exercise_library FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sens_exercise_library' AND policyname = 'Admins can update sens_exercise_library'
    ) THEN
        CREATE POLICY "Admins can update sens_exercise_library"
            ON public.sens_exercise_library FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'sens_exercise_library' AND policyname = 'Admins can delete custom sens_exercise_library'
    ) THEN
        CREATE POLICY "Admins can delete custom sens_exercise_library"
            ON public.sens_exercise_library FOR DELETE
            USING (
                is_custom = true AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;
END $$;

-- 3. Bucket público de Supabase Storage para fotos, GIFs y videos subidos por el Coach
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exercise-media',
    'exercise-media',
    true,
    26214400, -- 25 MB máx por archivo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400;

-- Políticas de Storage para exercise-media (lectura pública, escritura solo admin)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read exercise-media'
    ) THEN
        CREATE POLICY "Public read exercise-media"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'exercise-media');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins upload exercise-media'
    ) THEN
        CREATE POLICY "Admins upload exercise-media"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'exercise-media' AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins update exercise-media'
    ) THEN
        CREATE POLICY "Admins update exercise-media"
            ON storage.objects FOR UPDATE
            USING (
                bucket_id = 'exercise-media' AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins delete exercise-media'
    ) THEN
        CREATE POLICY "Admins delete exercise-media"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'exercise-media' AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role = 'admin'
                )
            );
    END IF;
END $$;
