-- =============================================================================
-- SENS TRAIN & WELLNESS — SCRIPT RÁPIDO PARA SUPABASE (SQL EDITOR)
-- Ejecutá este script completo en el SQL Editor de tu proyecto Supabase.
-- =============================================================================

-- 1. CREAR TABLA MAESTRA DE BIBLIOTECA DE EJERCICIOS (Si aún no existe)
CREATE TABLE IF NOT EXISTS public.sens_exercise_library (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    execution TEXT NOT NULL,
    breathing TEXT,
    recommendations TEXT,
    level TEXT DEFAULT 'Intermedio',
    objective TEXT,
    rest_seconds INTEGER DEFAULT 90,
    default_sets INTEGER DEFAULT 3,
    default_reps TEXT DEFAULT '10-12',
    video_url TEXT DEFAULT 'vid/pilar-2-vitalidad.mp4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sens_exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public.sens_exercise_library;
CREATE POLICY "Permitir lectura para todos" ON public.sens_exercise_library
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura solo para admin" ON public.sens_exercise_library;
CREATE POLICY "Permitir escritura solo para admin" ON public.sens_exercise_library
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- 2. ACTUALIZAR FUNCIÓN DE DETECCIÓN DE ADMIN (Nico & Lean)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'email' IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
        OR auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR user_type = 'admin')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ACTUALIZAR TRIGGER DE ALTA DE USUARIOS
-- (Registra nuevos usuarios como 'pending_activation' y a los admin como 'admin' y 'active')
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := (NEW.email IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com'));

    INSERT INTO public.profiles (
        id, 
        full_name, 
        email, 
        user_type, 
        role, 
        subscription_status, 
        billing_provider,
        onboarding_completed
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        CASE WHEN v_is_admin THEN 'admin' ELSE COALESCE(NEW.raw_user_meta_data->>'user_type', 'client_presencial_vip') END,
        CASE WHEN v_is_admin THEN 'admin' ELSE 'user_normal' END,
        CASE WHEN v_is_admin THEN 'active' ELSE 'pending_activation' END,
        'manual',
        v_is_admin
    )
    ON CONFLICT (id) DO UPDATE SET
        role = CASE WHEN v_is_admin THEN 'admin' ELSE public.profiles.role END,
        user_type = CASE WHEN v_is_admin THEN 'admin' ELSE public.profiles.user_type END,
        subscription_status = CASE WHEN v_is_admin THEN 'active' ELSE public.profiles.subscription_status END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. PROMOVER A ADMIN CUALQUIER PERFIL YA EXISTENTE DE NICO O LEAN
UPDATE public.profiles
SET role = 'admin', user_type = 'admin', subscription_status = 'active'
WHERE email IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com');
