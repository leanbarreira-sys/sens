-- =============================================================================
-- SENS TRAIN & WELLNESS — ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Módulo: Onboarding, Anamnesis Digital & Evaluación Postural
-- =============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLA DE PERFILES DE USUARIO (public.profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    goal TEXT CHECK (goal IN ('fat_loss', 'muscle_gain', 'recomp', 'posture_health')),
    phone TEXT,
    age INT,
    current_weight NUMERIC(5,2),
    height NUMERIC(5,2),
    role TEXT NOT NULL DEFAULT 'user_normal' CHECK (role IN ('user_normal', 'user_vip', 'admin')),
    vip_candidate BOOLEAN DEFAULT FALSE,
    vip_score NUMERIC(4,2) DEFAULT 0.0,
    daily_step_target INT DEFAULT 8000,
    active_plan_name TEXT DEFAULT 'Plan Personalizado SENS TRAIN',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    consent_version TEXT DEFAULT 'v1.0_2026',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 2. TABLA DE ANAMNESIS CLÍNICA Y DEPORTIVA (public.anamnesis)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gender TEXT,
    goal TEXT,
    parq_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    has_medical_flags BOOLEAN DEFAULT FALSE,
    parq_notes TEXT,
    active_injuries JSONB NOT NULL DEFAULT '[]'::jsonb,
    injury_intensities JSONB NOT NULL DEFAULT '{}'::jsonb,
    tape_measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    eva_score INT CHECK (eva_score BETWEEN 1 AND 10),
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    weekly_frequency INT CHECK (weekly_frequency BETWEEN 1 AND 7),
    available_equipment TEXT[] NOT NULL DEFAULT '{}',
    sleep_hours NUMERIC(3,1),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    neat_level TEXT CHECK (neat_level IN ('sedentary', 'moderate', 'active')),
    water_liters_baseline NUMERIC(3,1),
    historical_hurdle TEXT,
    mobility_tests JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_draft BOOLEAN DEFAULT FALSE,
    last_completed_step INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 3. TABLA DE EVALUACIONES POSTURALES Y MÉTRICAS (public.posture_evaluations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posture_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,2) NOT NULL,
    front_photo_url TEXT,
    side_photo_url TEXT,
    back_photo_url TEXT,
    evaluation_status TEXT DEFAULT 'pending_review' CHECK (evaluation_status IN ('pending_review', 'reviewed', 'flagged')),
    trainer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_anamnesis_user ON public.anamnesis(user_id);
CREATE INDEX IF NOT EXISTS idx_posture_evaluations_user ON public.posture_evaluations(user_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD Y PRIVACIDAD LEY 25.326
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posture_evaluations ENABLE ROW LEVEL SECURITY;

-- Helper Function: Verificar rol Administrador (Nico)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Profiles
CREATE POLICY "Profiles: lectura por propietario o admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles: inserción o actualización por propietario"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- Políticas para Anamnesis
CREATE POLICY "Anamnesis: lectura por propietario o admin"
    ON public.anamnesis FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Anamnesis: escritura por propietario"
    ON public.anamnesis FOR ALL
    USING (auth.uid() = user_id);

-- Políticas para Posture Evaluations
CREATE POLICY "Posture: lectura por propietario o admin"
    ON public.posture_evaluations FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Posture: inserción por propietario"
    ON public.posture_evaluations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- BUCKET DE ALMACENAMIENTO PRIVADO PARA FOTOGRAFÍAS POSTURALES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('posture_analysis', 'posture_analysis', false)
ON CONFLICT (id) DO NOTHING;

-- RLS en Storage para que solo el propietario y Admin suban y lean fotos
CREATE POLICY "Storage: subida de fotos en carpeta propia"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'posture_analysis' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Storage: lectura de fotos por propietario o admin"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'posture_analysis' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            public.is_admin()
        )
    );
