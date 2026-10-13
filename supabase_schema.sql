-- =============================================================================
-- SENS TRAIN & WELLNESS — ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Arquitectura Completa v3.0: Auth, Perfiles, Roles, Biblioteca de Ejercicios,
-- Planes de Entrenamiento, Hábitos Nutricionales, Logs Diarios & RLS
-- =============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLA DE PERFILES DE USUARIO (public.profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    goal TEXT CHECK (goal IN ('fat_loss', 'muscle_gain', 'recomp', 'posture_health', 'general_vitality')),
    phone TEXT,
    age INT,
    current_weight NUMERIC(5,2),
    height NUMERIC(5,2),
    -- Tipos de usuario SENS
    user_type TEXT NOT NULL DEFAULT 'client_presencial_vip' 
        CHECK (user_type IN (
            'admin',                    -- Nico (Coach & Admin)
            'client_presencial_vip',    -- Presencial 1 a 1 en CABA
            'client_presencial_group',  -- Presencial Dúos o Tríos
            'client_online_premium',    -- Online Asesorado Premium
            'client_online_basic',      -- Online Asesorado Básico
            'lead_pending'              -- Prospecto con evaluación inicial enviada
        )),
    role TEXT NOT NULL DEFAULT 'user_normal' CHECK (role IN ('user_normal', 'user_vip', 'admin')),
    daily_step_target INT DEFAULT 8000,
    daily_water_ml INT DEFAULT 2500,
    active_plan_name TEXT DEFAULT 'Presencial Personalizado 1 a 1 (CABA)',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    -- Facturación, Pagos y Estado de Membresía (Soporta validación manual de Nico y Pasarelas MercadoPago/Stripe)
    subscription_status TEXT NOT NULL DEFAULT 'pending_activation' 
        CHECK (subscription_status IN ('active', 'pending_activation', 'past_due', 'canceled', 'trial')),
    subscription_tier TEXT DEFAULT 'presencial_vip' 
        CHECK (subscription_tier IN ('presencial_vip', 'presencial_duo', 'presencial_trio', 'online_premium', 'online_basic', 'none')),
    billing_provider TEXT NOT NULL DEFAULT 'manual' 
        CHECK (billing_provider IN ('manual', 'mercadopago', 'stripe')),
    subscription_expires_at TIMESTAMPTZ,
    external_subscription_id TEXT,
    consent_timestamp TIMESTAMPTZ,
    consent_version TEXT DEFAULT 'v3.0_2026',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 2. TABLA DE LEADS / EVALUACIONES INICIALES ABIERTAS (public.leads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    preferred_modality TEXT NOT NULL DEFAULT 'presencial_caba' 
        CHECK (preferred_modality IN ('presencial_caba', 'presencial_grupo', 'online_premium', 'online_basico')),
    preferred_zone TEXT DEFAULT 'Palermo / Belgrano',
    fitness_goal TEXT,
    availability_notes TEXT,
    status TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'contactado', 'evaluacion_agendada', 'convertido', 'descartado')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 3. TABLA DE ANAMNESIS & EVALUACIÓN INICIAL (public.anamnesis)
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
    has_surgery BOOLEAN DEFAULT FALSE,
    surgery_detail TEXT,
    tape_measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    weekly_frequency INT CHECK (weekly_frequency BETWEEN 1 AND 7),
    available_equipment TEXT[] NOT NULL DEFAULT '{}',
    sleep_hours NUMERIC(3,1),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    neat_level TEXT CHECK (neat_level IN ('sedentary', 'moderate', 'active')),
    water_liters_baseline NUMERIC(3,1),
    historical_hurdle TEXT,
    historical_hurdle_detail TEXT,
    mobility_tests JSONB NOT NULL DEFAULT '{}'::jsonb,
    photos JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_draft BOOLEAN DEFAULT FALSE,
    last_completed_step INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 4. TABLA DE EVALUACIONES POSTURALES (public.posture_evaluations)
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
-- 5. CATÁLOGO MAESTRO DE EJERCICIOS (public.exercises)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN (
        'quadriceps',       -- Dominante de Rodilla
        'hamstrings_glutes',-- Dominante de Cadera
        'push',             -- Empuje Tren Superior
        'pull',             -- Tracción Tren Superior
        'core_mobility'     -- Core y Conciencia Corporal
    )),
    movement_pattern TEXT NOT NULL,
    cue_technical TEXT NOT NULL,      -- Sugerencia de técnica de Nico
    video_url TEXT,
    default_rest_seconds INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 6. ASIGNACIÓN DE PLAN DE ENTRENAMIENTO (public.user_workout_plans)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: Lunes ... 7: Domingo
    day_name TEXT NOT NULL,                                       -- ej. "Lunes - Fuerza y Empuje"
    focus_summary TEXT,                                           -- ej. "Foco en press y sobrecarga progresiva"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 7. ITEMS DE RUTINA ASIGNADOS A CADA PLAN (public.workout_plan_items)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.user_workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    order_index INT NOT NULL DEFAULT 1,
    target_sets INT NOT NULL DEFAULT 3,
    target_reps TEXT NOT NULL DEFAULT '8-12',
    target_rir INT DEFAULT 2,                                     -- Reps in Reserve
    rest_seconds INT DEFAULT 90,
    coach_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 8. REGISTRO DE SERIES COMPLETADAS (public.workout_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.user_workout_plans(id) ON DELETE SET NULL,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    set_number INT NOT NULL,
    weight_kg NUMERIC(6,2) NOT NULL,
    reps_completed INT NOT NULL,
    rir_actual INT,
    notes TEXT,
    completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 9. CATÁLOGO DE ALIMENTOS BASE Y HÁBITOS (public.food_catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('protein', 'carbs', 'healthy_fats', 'hydration_veg')),
    serving_hint TEXT NOT NULL,
    benefits_note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 10. GUÍAS Y HÁBITOS NUTRICIONALES POR USUARIO (public.user_nutrition_guidelines)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_nutrition_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    daily_protein_target_g INT DEFAULT 140,
    daily_water_target_ml INT DEFAULT 2500,
    recommended_foods JSONB NOT NULL DEFAULT '[]'::jsonb,
    habit_guidelines TEXT[] DEFAULT ARRAY[
        'Priorizar 25-35g de proteína en cada comida principal.',
        'Mínimo 2.5 litros de agua al día, incrementando 500ml en día de entreno.',
        'Cenar al menos 2 horas antes de dormir para optimizar la recuperación muscular.',
        'Incluir vegetales crudos o cocidos al vapor en almuerzo y cena.'
    ],
    coach_message TEXT DEFAULT 'Recordá que no buscamos restricciones obsesivas, sino sostener hábitos que le den energía real a tus entrenamientos de fuerza.',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- -----------------------------------------------------------------------------
-- 11. REGISTRO DIARIO DE HÁBITOS Y BIOMETRÍA (public.daily_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5,2),
    steps_count INT,
    water_liters NUMERIC(3,1),
    sleep_hours NUMERIC(3,1),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    habits_completed JSONB NOT NULL DEFAULT '{"protein": false, "water": false, "sleep": false, "mobility": false}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT unique_user_daily_log UNIQUE (user_id, log_date)
);

-- -----------------------------------------------------------------------------
-- ÍNDICES DE RENDIMIENTO Y CONSULTA
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_anamnesis_user ON public.anamnesis(user_id);
CREATE INDEX IF NOT EXISTS idx_posture_evaluations_user ON public.posture_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_user_workout_plans_user ON public.user_workout_plans(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_workout_plan_items_plan ON public.workout_plan_items(plan_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs(user_id, log_date);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD Y PRIVACIDAD LEY 25.326
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posture_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nutrition_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Verificar rol Administrador (Nico)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR user_type = 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Verificar Membresía Activa o Admin (Blindaje para planes y workouts)
CREATE OR REPLACE FUNCTION public.has_active_subscription() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND (subscription_status = 'active' OR role = 'admin' OR user_type = 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Automático: Crear perfil al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
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
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'client_presencial_vip'),
        'user_normal',
        'pending_activation',
        'manual',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas Profiles
CREATE POLICY "Profiles: lectura por propietario o admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles: escritura por propietario o admin"
    ON public.profiles FOR ALL
    USING (auth.uid() = id OR public.is_admin());

-- Políticas Leads
CREATE POLICY "Leads: inserción pública para captación"
    ON public.leads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Leads: lectura y gestión solo admin"
    ON public.leads FOR ALL
    USING (public.is_admin());

-- Políticas Anamnesis
CREATE POLICY "Anamnesis: lectura por propietario o admin"
    ON public.anamnesis FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Anamnesis: escritura por propietario o admin"
    ON public.anamnesis FOR ALL
    USING (auth.uid() = user_id OR public.is_admin());

-- Políticas Posture Evaluations
CREATE POLICY "Posture: lectura por propietario o admin"
    ON public.posture_evaluations FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Posture: inserción por propietario"
    ON public.posture_evaluations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas Catálogo Ejercicios y Alimentos (Lectura para todos los autenticados, edición admin)
CREATE POLICY "Exercises: lectura para autenticados"
    ON public.exercises FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Exercises: gestión por admin"
    ON public.exercises FOR ALL
    USING (public.is_admin());

CREATE POLICY "Food: lectura para autenticados"
    ON public.food_catalog FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Food: gestión por admin"
    ON public.food_catalog FOR ALL
    USING (public.is_admin());

-- Políticas Planes y Rutinas
CREATE POLICY "Workout Plans: lectura por propietario o admin"
    ON public.user_workout_plans FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Workout Plans: gestión por admin"
    ON public.user_workout_plans FOR ALL
    USING (public.is_admin());

CREATE POLICY "Workout Items: lectura por dueño del plan o admin"
    ON public.workout_plan_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_workout_plans 
            WHERE id = plan_id AND (user_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Workout Items: gestión por admin"
    ON public.workout_plan_items FOR ALL
    USING (public.is_admin());

-- Políticas Logs de Entrenamiento y Diarios
CREATE POLICY "Workout Logs: lectura por propietario o admin"
    ON public.workout_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Workout Logs: inserción por propietario"
    ON public.workout_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Daily Logs: lectura por propietario o admin"
    ON public.daily_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Daily Logs: escritura por propietario"
    ON public.daily_logs FOR ALL
    USING (auth.uid() = user_id);

-- Políticas Guías Nutricionales
CREATE POLICY "Nutrition Guidelines: lectura por propietario o admin"
    ON public.user_nutrition_guidelines FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Nutrition Guidelines: gestión por admin"
    ON public.user_nutrition_guidelines FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- BUCKET DE ALMACENAMIENTO PRIVADO PARA FOTOGRAFÍAS POSTURALES
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('posture_analysis', 'posture_analysis', false)
ON CONFLICT (id) DO NOTHING;

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

-- =============================================================================
-- SEED DATA: 10-15 EJERCICIOS POR GRUPO MUSCULAR (Curados por Nico)
-- =============================================================================

INSERT INTO public.exercises (name, muscle_group, movement_pattern, cue_technical, video_url, default_rest_seconds) VALUES
-- 1. Dominante de Rodilla (Cuádriceps & Cadena Anterior)
('Sentadilla Goblet con Mancuerna', 'quadriceps', 'Squat', 'Codos cerrados pegados al torso, bajada en 3 segundos buscando profundidad cómoda sin redondear lumbares.', 'https://www.youtube.com/watch?v=MeIiIdhvXT4', 90),
('Sentadilla Trasera con Barra', 'quadriceps', 'Squat', 'Barra apoyada firme en trapecios, pies al ancho de hombros, empuje uniforme desde el centro del pie.', 'https://www.youtube.com/watch?v=bEv6CCg2BC8', 120),
('Sentadilla Frontal con Barra', 'quadriceps', 'Squat', 'Codos altos y pecho orgulloso para mantener el torso vertical durante todo el recorrido.', 'https://www.youtube.com/watch?v=uYumuL_G_V0', 120),
('Prensa 45°', 'quadriceps', 'Leg Press', 'Pies a media plataforma, descender hasta 90° sin despegar el sacro del respaldo.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', 90),
('Estocadas Búlgaras con Mancuernas', 'quadriceps', 'Lunge', 'Pie trasero elevado en banco, ligera inclinación del torso hacia adelante para cargar cuádriceps y glúteo.', 'https://www.youtube.com/watch?v=2C-uNgKwPLE', 90),
('Step-up en Cajón Controlado', 'quadriceps', 'Single Leg Step', 'Todo el peso en la pierna de arriba, evitar impulsarse con la punta del pie en el suelo.', 'https://www.youtube.com/watch?v=dQqApCGd5Ss', 75),
('Sentadilla Hack en Máquina', 'quadriceps', 'Hack Squat', 'Espalda totalmente apoyada, control excéntrico en 3 segundos para máximo estímulo de vastos.', 'https://www.youtube.com/watch?v=0tn5K9NlCfo', 90),
('Extensión de Cuádriceps en Máquina', 'quadriceps', 'Isolation', 'Pausa isométrica de 1 segundo arriba, bajar sin golpear las placas.', 'https://www.youtube.com/watch?v=YyvSfVjQeL0', 60),
('Sentadilla Cosaca (Cossack Squat)', 'quadriceps', 'Lateral Squat / Mobility', 'Talón del pie flexionado en el suelo, excelente para apertura de cadera y fuerza unilateral.', 'https://www.youtube.com/watch?v=tpvgtrbp8ik', 75),
('Zancadas Caminando con Mancuernas', 'quadriceps', 'Lunge', 'Paso amplio, rodilla trasera roza suavemente el suelo con control.', 'https://www.youtube.com/watch?v=L8fvypPrzzs', 90),

-- 2. Dominante de Cadera (Isquiosurales, Glúteos & Espalda Baja)
('Peso Muerto Rumano con Mancuernas', 'hamstrings_glutes', 'Hinge', 'Empujar las caderas hacia atrás como si quisieras tocar la pared con los glúteos. Espalda neutra.', 'https://www.youtube.com/watch?v=JCXUYuzwNrM', 90),
('Hip Thrust con Barra en Banco', 'hamstrings_glutes', 'Glute Bridge', 'Mentón pegado al pecho, extender la cadera hasta alinear rodillas y hombros apretando glúteos 2 segundos.', 'https://www.youtube.com/watch?v=SEdqd1n0cvg', 90),
('Peso Muerto Convencional con Barra', 'hamstrings_glutes', 'Deadlift', 'Barra pegada a las tibias, dorsales activos antes de despegar el peso del suelo.', 'https://www.youtube.com/watch?v=op9kVnSso6Q', 150),
('Curl Femoral Acostado en Máquina', 'hamstrings_glutes', 'Leg Curl', 'Caderas firmes contra el banco, no arquear la columna lumbar al flexionar.', 'https://www.youtube.com/watch?v=1Tq3QdYUuHs', 75),
('Curl Femoral Sentado en Máquina', 'hamstrings_glutes', 'Leg Curl', 'Excelente estímulo en rango de estiramiento del isquiosural. Bajar lento en 3 segundos.', 'https://www.youtube.com/watch?v=Orxowest56U', 75),
('Buenos Días con Barra Ligera', 'hamstrings_glutes', 'Hinge', 'Ligera flexión de rodilla, bisagra pura de cadera para fortalecer erectores espinales e isquios.', 'https://www.youtube.com/watch?v=YA-h3n9L4YU', 90),
('Peso Muerto Rumano a Una Pierna', 'hamstrings_glutes', 'Single Leg Hinge', 'Cadera cuadrada mirando hacia el piso, enfoque en equilibrio y propiocepción.', 'https://www.youtube.com/watch?v=18ZkMeqwMaw', 75),
('Kettlebell Swing Estilo Ruso', 'hamstrings_glutes', 'Ballistic Hinge', 'Potencia explosiva desde los glúteos, los brazos solo acompañan la trayectoria de la pesa.', 'https://www.youtube.com/watch?v=YSxHifyI6s8', 60),
('Hiperextensiones a 45° para Cadena Posterior', 'hamstrings_glutes', 'Back Extension', 'Redondear ligeramente la zona dorsal alta para enfocar el esfuerzo en glúteos e isquios.', 'https://www.youtube.com/watch?v=ph3pddpKzzw', 75),
('Puente de Glúteos Unilateral en Suelo', 'hamstrings_glutes', 'Glute Bridge', 'Excelente ejercicio de activación previa o rehabilitación de cadera.', 'https://www.youtube.com/watch?v=AVox3Vpw44U', 60),

-- 3. Empuje Tren Superior (Pectoral, Deltoides Anterior/Lateral & Tríceps)
('Press de Banca Plano con Mancuernas', 'push', 'Horizontal Push', 'Escápulas retraídas y deprimidas, recorrido completo con los codos a 45-60 grados del torso.', 'https://www.youtube.com/watch?v=VmB1G1K7v94', 90),
('Press de Banca con Barra', 'push', 'Horizontal Push', 'Pies firmes clavados en el suelo, arco lumbar natural, descenso controlado al esternón.', 'https://www.youtube.com/watch?v=rT7DgCr-3pg', 120),
('Press Militar de Pie con Barra', 'push', 'Vertical Push', 'Glúteos y abdomen activos para proteger la zona lumbar, barra pasa cerca de la nariz.', 'https://www.youtube.com/watch?v=2yjwXTZQDDI', 120),
('Press Militar Sentado con Mancuernas', 'push', 'Vertical Push', 'Respaldo a 75-80°, empujar hacia arriba sin juntar ni chocar las mancuernas en el tope.', 'https://www.youtube.com/watch?v=qEwKCR5JCog', 90),
('Fondos en Paralelas Asistidos / Libres', 'push', 'Vertical Push', 'Ligera inclinación del pecho hacia adelante para enfocar fibras pectorales inferiores.', 'https://www.youtube.com/watch?v=2z8JmcrW-As', 90),
('Flexiones de Brazos (Push-ups) con Pausa', 'push', 'Horizontal Push', 'Cuerpo como una tabla sólida, pausa de 1 segundo con el pecho a 2 cm del suelo.', 'https://www.youtube.com/watch?v=IODxDxX7oi4', 75),
('Press Inclinado con Mancuernas (30°)', 'push', 'Incline Push', 'Inclinación sutil de 30° para priorizar haz clavicular del pectoral sin sobrecargar el hombro.', 'https://www.youtube.com/watch?v=8iPEnn-ltC8', 90),
('Aperturas en Polea (Crossover)', 'push', 'Flye', 'Movimiento de abrazo semicircular con contracción máxima de 1 segundo en el centro.', 'https://www.youtube.com/watch?v=taI4XduLpBe', 60),
('Elevaciones Laterales en Polea a Una Mano', 'push', 'Lateral Raise', 'Polea a la altura de la rodilla, elevar el codo alineado en el plano escapular.', 'https://www.youtube.com/watch?v=PPrzBWZDOhA', 60),
('Elevaciones Laterales con Mancuerna', 'push', 'Lateral Raise', 'Codos ligeramente flexionados, guiar el movimiento con los codos sin encoger hombros.', 'https://www.youtube.com/watch?v=3VcKaXpzqRo', 60),
('Extensión de Tríceps en Polea Alta con Cuerda', 'push', 'Triceps Extension', 'Codos pegados a los costados, separar la cuerda al final de la extensión.', 'https://www.youtube.com/watch?v=vB5OHsJ3EME', 60),
('Press Francés con Mancuernas en Banco Plano', 'push', 'Triceps Extension', 'Bajar mancuernas a los costados de las orejas sintiendo el estiramiento de la porción larga.', 'https://www.youtube.com/watch?v=d_KZxkY_0cM', 75),

-- 4. Tracción Tren Superior (Dorsal, Trapecio, Romboides & Bíceps)
('Dominadas Asistidas en Máquina o Banda', 'pull', 'Vertical Pull', 'Pecho hacia la barra, iniciar el tirón deprimiendo las escápulas antes de flexionar los brazos.', 'https://www.youtube.com/watch?v=y3JaVUf0G_s', 90),
('Jalón al Pecho en Polea con Agarre Neutro', 'pull', 'Vertical Pull', 'Tirar los codos hacia abajo y hacia los bolsillos traseros, manteniendo el pecho abierto.', 'https://www.youtube.com/watch?v=CAwf7n6Luuc', 90),
('Remo con Mancuerna a Una Mano en Banco', 'pull', 'Horizontal Pull', 'Espalda paralela al piso, tirar la mancuerna hacia la cadera evitando rotar el tronco.', 'https://www.youtube.com/watch?v=pYcpY20QaE8', 75),
('Remo con Barra Inclinado (Agarre Prono)', 'pull', 'Horizontal Pull', 'Torso a 45 grados, barra viaja rozando los muslos hacia el ombligo.', 'https://www.youtube.com/watch?v=G8l_8chR5BE', 90),
('Remo en Polea Baja con Agarre Estrecho (Gironda)', 'pull', 'Horizontal Pull', 'Espalda erguida, extender dorsales al frente y traccionar juntando escápulas.', 'https://www.youtube.com/watch?v=GZbfZ033f74', 75),
('Face Pull en Polea con Cuerda a la Frente', 'pull', 'Rear Delt / Posture', 'Traccionar hacia la altura de los ojos rotando externamente los hombros. Clave postural.', 'https://www.youtube.com/watch?v=rep-qVOkqgk', 60),
('Remo Apoyado en Banco Inclinado con Mancuernas', 'pull', 'Chest Supported Row', 'Elimina toda compensación lumbar, puro aislamiento de la espalda media.', 'https://www.youtube.com/watch?v=H75im9fAUMc', 75),
('Pullover en Polea Alta con Barra Recta', 'pull', 'Lat Isolation', 'Brazos casi extendidos, llevar la barra hacia los muslos comprimiendo los dorsales.', 'https://www.youtube.com/watch?v=fA4hQYk7C9w', 60),
('Curl de Bíceps con Mancuernas Supinadas', 'pull', 'Biceps Curl', 'Rotar la muñeca hacia afuera en la subida para máxima activación del bíceps braquial.', 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', 60),
('Curl Martillo con Mancuernas o Cuerda', 'pull', 'Biceps / Brachialis', 'Palmas mirándose entre sí todo el recorrido, fortalece braquial y antebrazo.', 'https://www.youtube.com/watch?v=zC3nLlEvin4', 60),
('Curl en Banco Inclinado a 45°', 'pull', 'Biceps Curl', 'Mancuernas cuelgan por detrás del torso para enfatizar la cabeza larga del bíceps.', 'https://www.youtube.com/watch?v=soxrZlIl35U', 75),

-- 5. Core, Estabilidad & Conciencia Corporal
('Plancha Frontal con Retroversión Pélvica (RKC)', 'core_mobility', 'Isometric Core', 'Apretar glúteos y cuádriceps, tirar los codos hacia las rodillas isométricamente (20-30s).', 'https://www.youtube.com/watch?v=6TKq62P_4gE', 60),
('Deadbug con Control Lumbar y Respiración', 'core_mobility', 'Anti-Extension', 'Espalda baja en contacto continuo con el suelo. Exhalar al extender brazo y pierna contraria.', 'https://www.youtube.com/watch?v=g_BYB0R-4Ws', 60),
('Press Pallof con Banda o Polea', 'core_mobility', 'Anti-Rotation', 'Extender los brazos al frente resistiendo la rotación del tronco, mantener 2 segundos.', 'https://www.youtube.com/watch?v=AH_QZLm_0-s', 60),
('Bird-Dog Dinámico Controlado', 'core_mobility', 'Cross-Body Stability', 'Extender brazo y pierna opuesta sin arquear la zona lumbar ni balancear la pelvis.', 'https://www.youtube.com/watch?v=wiFNA3sqjCA', 60),
('Paseo del Granjero con Mancuernas (Farmer Walk)', 'core_mobility', 'Loaded Carry', 'Caminar erguido con pasos firmes y cadencia controlada manteniendo los hombros neutros.', 'https://www.youtube.com/watch?v=Fkzk_RqlYig', 60),
('Rueda Abdominal con Rango Seguro de Rodillas', 'core_mobility', 'Anti-Extension', 'Mantener pelvis en retroversión, rodar hacia adelante hasta donde se mantenga el control.', 'https://www.youtube.com/watch?v=rqiTPdK1cjg', 75),
('Hollow Body Hold (Isométrico Gimnástico)', 'core_mobility', 'Gymnastic Core', 'Curva corporal cóncava con zona lumbar sellada al piso y brazos extendidos atrás.', 'https://www.youtube.com/watch?v=44ScXWFaVBs', 60),
('Movilidad Gato-Vaca y Descompresión Espinal', 'core_mobility', 'Spinal Mobility', 'Sincronizar inhalación en extensión y exhalación en flexión dorsal completa.', 'https://www.youtube.com/watch?v=W_X0R3V3X2Y', 45),
('Rotaciones Torácicas en Posición Cuadrúpeda', 'core_mobility', 'Thoracic Mobility', 'Mano en la nuca, abrir el codo hacia el techo buscando rotar la columna dorsal.', 'https://www.youtube.com/watch?v=2T_LpL_3c2s', 45);

-- =============================================================================
-- SEED DATA: CATÁLOGO DE ALIMENTOS BASE (Curados por Nico)
-- =============================================================================

INSERT INTO public.food_catalog (name, category, serving_hint, benefits_note) VALUES
-- Proteínas
('Pechuga de Pollo / Pavo', 'protein', '150 - 200g cocido por porción', 'Proteína magra de altísimo valor biológico, digestión ágil y nula grasa saturada agregada.'),
('Huevos de Campo Enteros', 'protein', '2 a 4 unidades diarias', 'Aporte completo de aminoácidos esenciales, colina para la función cerebral y grasas saludables.'),
('Carne Vacuna Magra (Lomo, Cuadril)', 'protein', '150 - 200g, 2 a 3 veces por semana', 'Rica en hierro hemínico, zinc y creatina natural para soporte de fuerza y masa muscular.'),
('Atún al Natural / Salmón Blanco', 'protein', '1 lata o 150 - 180g filete', 'Proteína de fácil absorción y ácidos grasos que favorecen la recuperación tisular.'),
('Yogur Griego Natural (Sin Azúcar)', 'protein', '150 - 200g (desayuno o merienda)', 'Rico en caseína de digestión lenta y probióticos para la salud de la microbiota intestinal.'),
('Tofu Firme / Seitán Orgánico', 'protein', '180 - 220g salteado', 'Excelente fuente de proteína vegetal completa para opciones basadas en plantas.'),
('Proteína de Suero Aislada (Whey Isolate)', 'protein', '1 scoop (25-30g) post-entreno o colación', 'Practicidad óptima para alcanzar los gramos diarios de proteína sin sumar grasas extras.'),

-- Carbohidratos Complejos
('Arroz Integral / Basmati al Vapor', 'carbs', '1 taza cocida (150-180g)', 'Energía limpia y sostenida para reponer glucógeno muscular post-entrenamiento.'),
('Papa y Batata Horneadas con Piel', 'carbs', '1 unidad mediana (180-200g)', 'Ricas en potasio, almidón resistente y gran poder de saciedad sin pesadez digestiva.'),
('Avena Arrollada Tradicional', 'carbs', '40 - 60g en porridge o batido', 'Fibra betaglucano que estabiliza la glucemia y brinda saciedad prolongada por la mañana.'),
('Quinoa Cocida', 'carbs', '1 taza cocida', 'Pseudocereal con perfil balanceado de carbohidratos complejos y micronutrientes.'),
('Frutas Enteras de Temporada (Banana, Manzana, Frutos Rojos)', 'carbs', '1 a 2 porciones al día', 'Antioxidantes naturales, vitaminas y fructosa natural para energía previa a la sesión.'),
('Pan de Masa Madre Genuino', 'carbs', '1 a 2 rebanadas tostadas', 'Fermentación lenta que degrada antinutrientes facilitando la asimilación digestiva.'),

-- Grasas Saludables
('Palta (Aguacate)', 'healthy_fats', '1/2 unidad al día', 'Ácidos grasos monoinsaturados que apoyan la salud cardiovascular y hormonal.'),
('Aceite de Oliva Extra Virgen (Crudo)', 'healthy_fats', '1 cucharada sopera en ensaladas', 'Polifenoles y grasas antiinflamatorias esenciales para articulaciones.'),
('Frutos Secos (Nueces, Almendras, Castañas)', 'healthy_fats', '1 puñado cerrado (30g)', 'Densidad energética y magnesio para relajar el sistema neuromuscular.'),
('Semillas de Chía y Lino Molidas', 'healthy_fats', '1 cucharadita en yogur o avena', 'Ácido alfa-linolénico (Omega 3 vegetal) y fibra soluble reguladora.'),

-- Hidratación & Vegetales
('Agua Mineral / Filtrada', 'hydration_veg', 'Meta: 35ml por kg de peso (2.5L a 3.5L/día)', 'El medio fundamental para el rendimiento muscular y la eliminación de fatiga.'),
('Vegetales de Hoja Verde (Espinaca, Rúcula, Kale)', 'hydration_veg', 'Libre en almuerzo y cena', 'Nitratos naturales para vasodilatación y micronutrientes sin calorías vacías.'),
('Brócoli y Espárragos al Vapor', 'hydration_veg', '1 taza colmada', 'Crucíferas con componentes desintoxicantes y soporte a la digestión.');
