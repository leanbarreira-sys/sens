-- =============================================================================
-- SENS TRAIN & WELLNESS — MIGRACIÓN PARA PRESCRIPCIÓN DE COACH (NICO)
-- Ejecutá este script en el SQL Editor de tu proyecto Supabase para que las
-- rutinas, nutrición y notas asignadas por Nico impacten en el portal del alumno.
-- =============================================================================

-- 1. Agregar columnas de prescripción a la tabla public.profiles (si no existen)
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS prescribed_workouts JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS prescribed_nutrition JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS coach_notes JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS directive_note TEXT;

-- 2. Asegurar que las políticas RLS permitan al Coach actualizar perfiles de alumnos
DROP POLICY IF EXISTS "Profiles: escritura por propietario o admin" ON public.profiles;
CREATE POLICY "Profiles: escritura por propietario o admin"
    ON public.profiles FOR ALL
    USING (
        auth.uid() = id 
        OR public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean_barreira@hotmail.com', 'lean@sens.com', 'admin@sens.com')
    )
    WITH CHECK (
        auth.uid() = id 
        OR public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean_barreira@hotmail.com', 'lean@sens.com', 'admin@sens.com')
    );

DROP POLICY IF EXISTS "Profiles: lectura por propietario o admin" ON public.profiles;
CREATE POLICY "Profiles: lectura por propietario o admin"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean_barreira@hotmail.com', 'lean@sens.com', 'admin@sens.com')
    );

-- 3. Columnas de compatibilidad en daily_logs (evitar error 400 en métricas)
ALTER TABLE public.daily_logs 
    ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS steps INTEGER,
    ADD COLUMN IF NOT EXISTS calories_consumed INTEGER,
    ADD COLUMN IF NOT EXISTS water_ml INTEGER;

-- 4. Habilitar Supabase Realtime para la tabla public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 5. Confirmar que RLS esté activo en public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Recargar la caché del esquema en PostgREST de forma inmediata
NOTIFY pgrst, 'reload schema';
