-- =============================================================================
-- SENS COACH OS — CRUD DE EJERCICIOS, FAVORITOS Y STORAGE DE MEDIA (IDEMPOTENTE)
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- Compatible con cualquier versión previa de public.sens_exercise_library.
-- No altera ni borra ejercicios existentes.
-- =============================================================================

-- 1. Asegurar todas las columnas necesarias en public.sens_exercise_library
ALTER TABLE public.sens_exercise_library
    ADD COLUMN IF NOT EXISTS name_es TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS name_pt TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS nivel_1_tipo TEXT DEFAULT 'muscular',
    ADD COLUMN IF NOT EXISTS nivel_2_grupo_muscular TEXT DEFAULT 'piernas',
    ADD COLUMN IF NOT EXISTS nivel_3_submusculo_piernas TEXT,
    ADD COLUMN IF NOT EXISTS cue_technical_es TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cue_technical_en TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cue_technical_pt TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS summary_detailed_movement_es TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS summary_detailed_movement_en TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS summary_detailed_movement_pt TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS detailed_movement_es TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS detailed_movement_en TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS detailed_movement_pt TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS calories_per_rep NUMERIC(5,2) NOT NULL DEFAULT 0.45,
    ADD COLUMN IF NOT EXISTS video_local_path TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS default_rest_seconds INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Hacer opcionales / con default las columnas heredadas (si existen) para evitar errores NOT NULL
DO $$
DECLARE
    col_name TEXT;
    legacy_cols TEXT[] := ARRAY[
        'name', 'category', 'muscle_group', 'primary_muscle', 'execution',
        'video_local_path', 'cue_technical_es', 'cue_technical_en', 'cue_technical_pt',
        'summary_detailed_movement_es', 'summary_detailed_movement_en', 'summary_detailed_movement_pt',
        'detailed_movement_es', 'detailed_movement_en', 'detailed_movement_pt'
    ];
BEGIN
    FOREACH col_name IN ARRAY legacy_cols LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sens_exercise_library'
              AND column_name = col_name
        ) THEN
            EXECUTE format('ALTER TABLE public.sens_exercise_library ALTER COLUMN %I SET DEFAULT ''''', col_name);
            EXECUTE format('ALTER TABLE public.sens_exercise_library ALTER COLUMN %I DROP NOT NULL', col_name);
        END IF;
    END LOOP;
END $$;

-- Índice liviano para sincronizar solo ejercicios creados/editados/favoritos al abrir el Portal
CREATE INDEX IF NOT EXISTS idx_sens_ex_custom_fav_updated
    ON public.sens_exercise_library (is_custom, is_favorite, updated_at DESC);

-- 2. Políticas RLS de escritura exclusivas para Coaches / Admins
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'sens_exercise_library' AND policyname = 'Admins can insert sens_exercise_library'
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
        WHERE schemaname = 'public' AND tablename = 'sens_exercise_library' AND policyname = 'Admins can update sens_exercise_library'
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
        WHERE schemaname = 'public' AND tablename = 'sens_exercise_library' AND policyname = 'Admins can delete custom sens_exercise_library'
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
