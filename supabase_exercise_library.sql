-- =============================================================================
-- TABLA DE BIBLIOTECA MAESTRA DE EJERCICIOS SENS (PostgreSQL / Supabase)
-- =============================================================================

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

-- Habilitar RLS
ALTER TABLE public.sens_exercise_library ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos los usuarios autenticados
CREATE POLICY "Permitir lectura para todos" ON public.sens_exercise_library
    FOR SELECT USING (true);

-- Política de escritura solo para administradores / coaches
CREATE POLICY "Permitir escritura solo para admin" ON public.sens_exercise_library
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('nico@sens.com', 'nicomaralle@gmail.com', 'lean.barreira@gmail.com', 'lean@sens.com', 'admin@sens.com')
        OR auth.jwt() ->> 'role' = 'service_role'
        OR public.is_admin()
    );
