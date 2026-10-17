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
        OR (auth.jwt() ->> 'email') IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
    );

DROP POLICY IF EXISTS "Profiles: lectura por propietario o admin" ON public.profiles;
CREATE POLICY "Profiles: lectura por propietario o admin"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_admin()
        OR (auth.jwt() ->> 'email') IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
    );

-- 3. Confirmar que RLS esté activo en public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
