-- =============================================================================
-- SENS Coach Landings / Guías HTML Personalizadas por Alumno
-- Permite que cualquier link makesens.com.ar/<slug> se cargue desde cualquier dispositivo
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coach_landings (
    slug TEXT PRIMARY KEY,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    html_content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_landings_athlete_id ON public.coach_landings(athlete_id);

ALTER TABLE public.coach_landings ENABLE ROW LEVEL SECURITY;

-- Lectura pública para que cualquier link compartido makesens.com.ar/xxxxx abra sin login
DROP POLICY IF EXISTS "coach_landings_public_read" ON public.coach_landings;
CREATE POLICY "coach_landings_public_read"
    ON public.coach_landings
    FOR SELECT
    USING (true);

-- Solo el Coach / Admin autenticado puede crear, editar o eliminar landings
DROP POLICY IF EXISTS "coach_landings_admin_write" ON public.coach_landings;
CREATE POLICY "coach_landings_admin_write"
    ON public.coach_landings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.role IN ('admin', 'coach') OR p.is_admin = TRUE)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (p.role IN ('admin', 'coach') OR p.is_admin = TRUE)
        )
    );
