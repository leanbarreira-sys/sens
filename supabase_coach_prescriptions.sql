-- =============================================================================
-- SENS TRAIN & WELLNESS — MIGRACIÓN ARQUITECTURA RBAC (ROLE-BASED ACCESS CONTROL)
-- Cero emails hardcodeados. Permisos basados estrictamente en roles (admin / coach).
-- =============================================================================

-- 1. Agregar columnas de prescripción a la tabla public.profiles (si no existen)
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS prescribed_workouts JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS prescribed_nutrition JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS coach_notes JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS directive_note TEXT;

-- 2. Función canónica RBAC: verifica si el usuario autenticado tiene rol 'admin' o 'coach'
-- (Seguridad por diseño: SECURITY DEFINER con search_path explícito para evitar recursión de RLS)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    -- A) Si la llamada proviene del backend / Edge Functions (service_role)
    IF (auth.jwt() ->> 'role') = 'service_role' THEN
        RETURN TRUE;
    END IF;

    -- B) Si el token JWT tiene rol 'admin' o 'coach' en claims (app_metadata / user_metadata)
    IF (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coach') 
       OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'coach') THEN
        RETURN TRUE;
    END IF;

    -- C) Si el perfil del usuario autenticado en la base de datos tiene rol 'admin' o 'coach'
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND (role IN ('admin', 'coach') OR user_type IN ('admin', 'coach'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 3. Políticas RLS basadas 100% en RBAC (Cero emails hardcodeados)
-- A) Lectura: el usuario puede leer su propio perfil; el admin/coach puede leer todos los perfiles
DROP POLICY IF EXISTS "Profiles: lectura por propietario o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir lectura de perfiles a su dueño o coach" ON public.profiles;
CREATE POLICY "Profiles: lectura por propietario o admin"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_admin()
    );

-- B) Escritura: el usuario puede actualizar su propio perfil; el admin/coach puede gestionar y prescribir a cualquier alumno
DROP POLICY IF EXISTS "Profiles: escritura por propietario o admin" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualizacion de perfiles a su dueño o coach" ON public.profiles;
CREATE POLICY "Profiles: escritura por propietario o admin"
    ON public.profiles FOR ALL
    USING (
        auth.uid() = id 
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = id 
        OR public.is_admin()
    );

-- 4. Columnas de compatibilidad en daily_logs (evitar error 400 en métricas diarias)
ALTER TABLE public.daily_logs 
    ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS steps INTEGER,
    ADD COLUMN IF NOT EXISTS calories_consumed INTEGER,
    ADD COLUMN IF NOT EXISTS water_ml INTEGER;

-- 5. Habilitar Supabase Realtime para la tabla public.profiles
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

-- 6. Confirmar que RLS esté activo en public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Recargar la caché del esquema en PostgREST de forma inmediata
NOTIFY pgrst, 'reload schema';
