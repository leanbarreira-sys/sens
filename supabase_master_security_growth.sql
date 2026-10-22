-- =============================================================================
-- MAKES SENS. — ARQUITECTURA UNIFICADA DE SEGURIDAD ANTI-VIBECODING,
-- MOTOR SAAS AUTÓNOMO (AUTO-PRESCRIPCIÓN), RACHAS & VIRAL LOOP ANTIFRAUDE
-- Archivo: supabase_master_security_growth.sql
-- Ejecución: Idempotente (IF NOT EXISTS / CREATE OR REPLACE).
-- Copiar y pegar íntegramente en el SQL Editor de Supabase y presionar "Run".
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SEGURIDAD ANTI-VIBECODING Y BLINDAJE DE public.profiles
-- -----------------------------------------------------------------------------

-- 1.1 Asegurar columnas de negocio, suscripción, rachas y auto-prescripción en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'app_trial',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_workouts_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekend_refeed_unlocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consistency_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_weeks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS available_days INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS daily_calorie_target INT,
  ADD COLUMN IF NOT EXISTS daily_protein_target_g INT,
  ADD COLUMN IF NOT EXISTS daily_carbs_target_g INT,
  ADD COLUMN IF NOT EXISTS daily_fats_target_g INT,
  ADD COLUMN IF NOT EXISTS daily_water_ml INT,
  ADD COLUMN IF NOT EXISTS prescribed_workouts JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prescribed_nutrition JSONB DEFAULT NULL;

-- Asegurar constraint flexible para plan_tier y subscription_status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_plan_tier_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_plan_tier_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_tier_check
    CHECK (plan_tier IN ('app_trial', 'app_subscribed', 'online_1on1', 'presencial_1on1', 'vip'));

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_subscription_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_status_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_subscription_status_check
    CHECK (subscription_status IN (
      'trial', 'active', 'expired', 'vip_manual',
      'pending_activation', 'paused', 'past_due', 'canceled'
    ));
END $$;

-- 1.2 Generador determinístico de código de referido único (SENS-XXXX)
CREATE OR REPLACE FUNCTION public.generate_sens_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    candidate := 'SENS-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = candidate) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Backfill idempotente para perfiles existentes (con bypass activado por si ya existía el trigger anterior)
SELECT set_config('app.bypass_profile_guard', 'on', true);

UPDATE public.profiles
SET
  referral_code = COALESCE(referral_code, public.generate_sens_referral_code()),
  trial_ends_at = COALESCE(trial_ends_at, COALESCE(created_at, NOW()) + INTERVAL '7 days'),
  plan_tier = CASE
    WHEN plan_tier IS NOT NULL THEN plan_tier
    WHEN role IN ('admin', 'trainer', 'coach') THEN 'vip'
    WHEN subscription_status = 'active' THEN 'app_subscribed'
    ELSE 'app_trial'
  END,
  subscription_status = CASE
    WHEN subscription_status IS NULL OR subscription_status = 'pending_activation' THEN 'trial'
    ELSE subscription_status
  END,
  streak_days = COALESCE(streak_days, 0),
  weekly_workouts_completed = COALESCE(weekly_workouts_completed, 0),
  weekend_refeed_unlocked = COALESCE(weekend_refeed_unlocked, FALSE);

SELECT set_config('app.bypass_profile_guard', 'off', true);

-- Trigger BEFORE INSERT para inicializar trial de 7 días y código SENS-XXXX
CREATE OR REPLACE FUNCTION public.trg_init_profile_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_sens_referral_code();
  END IF;

  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;

  IF NEW.plan_tier IS NULL OR btrim(NEW.plan_tier) = '' THEN
    NEW.plan_tier := 'app_trial';
  END IF;

  IF NEW.subscription_status IS NULL OR NEW.subscription_status = 'pending_activation' THEN
    NEW.subscription_status := 'trial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_init_defaults ON public.profiles;
CREATE TRIGGER on_profile_init_defaults
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_init_profile_defaults();

-- 1.3 Verificación de rol privilegiado (admin / trainer / coach)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  jwt_role TEXT;
  jwt_email TEXT;
  db_role TEXT;
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_setting('app.bypass_profile_guard', true) = 'on' THEN
    RETURN TRUE;
  END IF;

  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
  jwt_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

  IF jwt_role IN ('admin', 'coach', 'trainer')
     OR jwt_email IN ('entrenador@makessens.com', 'nicolas@makessens.com') THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO db_role FROM public.profiles WHERE id = auth.uid();
    IF db_role IN ('admin', 'trainer', 'coach') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.4 Trigger Anti-Escalación de Privilegios (trg_protect_profile_sensitive_fields)
-- Impide que un usuario común modifique manualmente role, plan_tier, subscription_status,
-- trial_ends_at, premium_until, streak_days o weekend_refeed_unlocked desde el cliente.
CREATE OR REPLACE FUNCTION public.fn_protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir operaciones del motor interno (triggers/funciones SECURITY DEFINER, service_role o SQL Editor)
  IF current_setting('app.bypass_profile_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Si es un alumno editando su propio perfil, bloquear mutación de campos críticos
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tenes permisos para modificar el rol de acceso.';
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tenes permisos para modificar el nivel de plan (plan_tier).';
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tenes permisos para modificar el estado de suscripcion.';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tenes permisos para alterar la fecha de prueba.';
  END IF;

  IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tenes permisos para alterar la vigencia de la membresia.';
  END IF;

  IF NEW.streak_days IS DISTINCT FROM OLD.streak_days THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: La racha se calcula automaticamente en el servidor.';
  END IF;

  IF NEW.weekend_refeed_unlocked IS DISTINCT FROM OLD.weekend_refeed_unlocked THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Los desbloqueos metabolicos son gestionados exclusivamente por el servidor.';
  END IF;

  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code AND OLD.referral_code IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: El codigo de referido es inmutable.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_sensitive_fields();

-- 1.5 Función Maestra de Control de Acceso (public.has_active_access)
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_plan_tier TEXT;
  v_sub_status TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_premium_until TIMESTAMPTZ;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, plan_tier, subscription_status, trial_ends_at, premium_until
    INTO v_role, v_plan_tier, v_sub_status, v_trial_ends, v_premium_until
  FROM public.profiles
  WHERE id = user_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 1. Admin / Trainer / Coach siempre tienen acceso total
  IF v_role IN ('admin', 'trainer', 'coach') THEN
    RETURN TRUE;
  END IF;

  -- 2. Alumnos de planes 1 a 1 o VIP
  IF v_plan_tier IN ('online_1on1', 'presencial_1on1', 'vip') THEN
    RETURN TRUE;
  END IF;

  -- 3. Suscripción activa vigente
  IF v_sub_status IN ('active', 'vip_manual')
     AND (v_premium_until IS NULL OR v_premium_until > NOW()) THEN
    RETURN TRUE;
  END IF;

  -- 4. Período de prueba Reverse Trial de 7 días (o extendido por recompensas)
  IF v_trial_ends IS NOT NULL AND NOW() <= v_trial_ends THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 2. MOTOR DE AUTO-PRESCRIPCIÓN INSTANTÁNEA (ENTRENAMIENTO + NUTRICIÓN SAAS)
-- -----------------------------------------------------------------------------

-- Tabla relacional public.workouts (compatible con la estructura existente y prescripción SaaS)
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL, -- 'day1', 'day3', 'day5'
  title TEXT NOT NULL,
  modality TEXT DEFAULT 'Gimnasio / Pesas',
  day_order INT DEFAULT 1,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_auto_prescribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_key)
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage workouts" ON public.workouts;
CREATE POLICY "Admins can manage workouts"
  ON public.workouts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Asegurar columnas extendidas y compatibilidad en public.exercises (sobre supabase_schema.sql)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'strength',
  ADD COLUMN IF NOT EXISTS movement_pattern TEXT DEFAULT 'Fuerza & Control Motor',
  ADD COLUMN IF NOT EXISTS cue_technical TEXT DEFAULT 'Controlá la fase excéntrica y mantené estabilidad lumbopélvica.',
  ADD COLUMN IF NOT EXISTS cue_1 TEXT,
  ADD COLUMN IF NOT EXISTS cue_2 TEXT,
  ADD COLUMN IF NOT EXISTS cue_3 TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exercises_muscle_group_check'
      AND conrelid = 'public.exercises'::regclass
  ) THEN
    ALTER TABLE public.exercises DROP CONSTRAINT exercises_muscle_group_check;
  END IF;
END $$;

-- Asegurar semilla de los 11 ejercicios maestros en public.exercises si no existen
INSERT INTO public.exercises (name, muscle_group, category, movement_pattern, cue_technical, video_url, cue_1, cue_2, cue_3)
SELECT v.name, v.muscle_group, v.category, v.movement_pattern, v.cue_1, v.video_url, v.cue_1, v.cue_2, v.cue_3
FROM (
  VALUES
    ('Press de Banca Plano con Mancuernas', 'push', 'strength', 'Empuje Horizontal', 'EJERCICIOS/videos_loop_final/43bad14a-f720-45bd-8e3e-acdb7a2cd3ec.mp4', 'Retraé y deprimí las escápulas contra el banco antes de empujar.', 'Descendé con codos a 45° protegiendo la cápsula anterior del hombro.', 'Exhalá al empujar manteniendo glúteos y pies firmes contra el piso.'),
    ('Press Militar Sentado con Mancuernas', 'push', 'strength', 'Empuje Vertical', 'EJERCICIOS/videos_loop_final/9e317f1f-4918-4f3e-9c57-eb0adfe7f004.mp4', 'Mantené las costillas bajas (cierre costal) sin hiperextender la zona lumbar.', 'Empujá en el plano escapular (30° hacia adelante, no abierto a 90°).', 'Controlá el descenso en 2 segundos hasta la altura del mentón.'),
    ('Flexiones de Brazos (Push-ups) con Pausa', 'push', 'strength', 'Empuje Integrado', 'EJERCICIOS/videos_loop_final/f37de49f-5f7b-4fbf-a392-495f38f7fd1f.mp4', 'Alineá cabeza, columna dorsal y pelvis en bloque compacto.', 'Pausa de 1 segundo real a 2 cm del suelo sin perder tensión abdominal.', 'Empujá el piso separando las escápulas al final del recorrido.'),
    ('Plancha Frontal con Retroversión Pélvica (RKC)', 'core_mobility', 'core', 'Core Anti-Extensión', 'EJERCICIOS/videos_loop_final/2ae448e6-0a99-4664-898d-bfbf94080b37.mp4', 'Traccioná los codos imaginariamente hacia las puntas de los pies.', 'Contraé glúteos al 100% buscando aplanar la curvatura lumbar.', 'Respirá corto y controlado detrás del escudo abdominal.'),
    ('Peso Muerto Rumano con Mancuernas', 'hamstrings_glutes', 'strength', 'Bisagra de Cadera', 'EJERCICIOS/videos_loop_final/aad15275-4bb0-4459-a180-6c9f5dbe6d95.mp4', 'Iniciá el movimiento empujando la cadera estrictamente hacia atrás (bisagra pura).', 'Deslizá las mancuernas pegadas a los muslos manteniendo dorsales activos.', 'Frená el descenso apenas la cadera deje de viajar hacia atrás.'),
    ('Remo con Mancuerna a Una Mano en Banco', 'pull', 'strength', 'Tracción Unilateral', 'EJERCICIOS/videos_loop_final/7f93fada-7563-4965-b189-2ffadbd5a967.mp4', 'Llevá la mancuerna hacia el bolsillo de la cadera en arco, no hacia el hombro.', 'Evitá rotar el torso; columna torácica firme y paralela al piso.', 'Sostené 1 segundo en máxima contracción dorsal antes de bajar.'),
    ('Kettlebell Swing Estilo Ruso', 'hamstrings_glutes', 'strength', 'Potencia de Cadera', 'EJERCICIOS/videos_loop_final/c27c05f6-481a-4791-ac2f-6518b89d0d31.mp4', 'Es una proyección horizontal explosiva de cadera, no una elevación frontal de hombros.', 'Esperá a que los antebrazos toquen las ingles antes de bisagrar la cadera.', 'Bloqueá rodillas, glúteos y abdomen en plancha vertical al llegar arriba.'),
    ('Sentadilla Goblet con Mancuerna', 'quadriceps', 'strength', 'Dominante de Rodilla', 'EJERCICIOS/videos_loop_final/c43a4011-a963-48cf-8a07-a9f6a5274d00.mp4', 'Sostené la carga pegada al esternón con los codos apuntando hacia abajo.', 'Abrí caderas descendiendo entre tus rodillas sin colapsar el arco plantar.', 'Mantené el torso erguido y empujá el suelo con todo el trípode del pie.'),
    ('Hip Thrust con Barra en Banco', 'hamstrings_glutes', 'strength', 'Extensión de Cadera', 'EJERCICIOS/videos_loop_final/1c022132-227d-4411-bc96-8e13569090d0.mp4', 'Apoyá el borde inferior de las escápulas en el banco y fijá la mirada al frente.', 'Al subir, las tibias deben quedar a 90° exactos respecto al suelo.', 'Realizá retroversión pélvica arriba sin arquear la columna lumbar.'),
    ('Estocadas Búlgaras con Mancuernas', 'quadriceps', 'strength', 'Unilateral de Pierna', 'EJERCICIOS/videos_loop_final/f9906ab7-1991-41dd-8fc6-be4262039311.mp4', 'Incliná levemente el torso hacia adelante (15°) para reclutar glúteo mayor.', 'El 85% del peso recae sobre el talón y mediopié de la pierna delantera.', 'Evitá que la rodilla delantera colapse hacia adentro (valgo dinámico).'),
    ('Movilidad Gato-Vaca y Descompresión Espinal', 'core_mobility', 'mobility', 'Movilidad Espinal', 'EJERCICIOS/videos_loop_final/fe1dba64-4f45-4aa3-bbd2-8266736028a1.mp4', 'Mové vértebra por vértebra iniciando siempre desde la pelvis.', 'Inhalá profundo expandiendo la caja torácica en extensión controlada.', 'Exhalá todo el aire empujando el suelo para separar las escápulas.')
) AS v(name, muscle_group, category, movement_pattern, video_url, cue_1, cue_2, cue_3)
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.name = v.name
);

-- Función PostgreSQL: public.assign_automated_starter_plan(target_user_id UUID)
CREATE OR REPLACE FUNCTION public.assign_automated_starter_plan(target_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_weight NUMERIC;
  v_height NUMERIC;
  v_age INT;
  v_gender TEXT;
  v_goal TEXT;
  v_activity_factor NUMERIC := 1.45;
  v_bmr NUMERIC;
  v_tdee INT;
  v_target_kcal INT;
  v_protein_g INT;
  v_fats_g INT;
  v_carbs_g INT;
  v_water_ml INT;
  v_day1_ex JSONB;
  v_day3_ex JSONB;
  v_day5_ex JSONB;
  v_prescribed_workouts JSONB;
  v_prescribed_nutrition JSONB;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id no puede ser nulo';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'profile_not_found');
  END IF;

  -- Si Nico ya le prescribió una rutina personalizada manualmente, no sobreescribirla
  IF v_profile.prescribed_workouts IS NOT NULL
     AND jsonb_typeof(v_profile.prescribed_workouts) = 'object'
     AND v_profile.prescribed_workouts <> '{}'::jsonb THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'already_has_prescribed_workouts');
  END IF;

  -- 1. Cálculo Mifflin-St Jeor según peso, altura, edad, género y objetivo
  v_weight := COALESCE(NULLIF(v_profile.current_weight, 0), NULLIF(v_profile.weight_kg, 0), 74);
  v_height := COALESCE(NULLIF(v_profile.height, 0), NULLIF(v_profile.height_cm, 0), 174);
  v_age    := COALESCE(NULLIF(v_profile.age, 0), 34);
  v_gender := COALESCE(v_profile.gender, 'male');
  v_goal   := COALESCE(v_profile.goal, 'recomp');

  IF v_gender = 'female' THEN
    v_bmr := (10 * v_weight) + (6.25 * v_height) - (5 * v_age) - 161;
  ELSE
    v_bmr := (10 * v_weight) + (6.25 * v_height) - (5 * v_age) + 5;
  END IF;

  IF COALESCE(v_profile.available_days, 3) >= 4 THEN
    v_activity_factor := 1.55;
  ELSIF COALESCE(v_profile.available_days, 3) <= 2 THEN
    v_activity_factor := 1.375;
  ELSE
    v_activity_factor := 1.45;
  END IF;

  v_tdee := ROUND(v_bmr * v_activity_factor);

  -- Ajuste calórico según objetivo ('recomposicion'/'recomp'/'fat_loss' -> TDEE - 350; 'fuerza'/'hipertrofia'/'muscle_gain' -> TDEE + 200)
  IF v_goal IN ('recomp', 'recomposicion', 'fat_loss') THEN
    v_target_kcal := GREATEST(1450, v_tdee - 350);
  ELSIF v_goal IN ('muscle_gain', 'fuerza', 'hipertrofia') THEN
    v_target_kcal := v_tdee + 200;
  ELSE
    v_target_kcal := v_tdee - 200;
  END IF;

  -- Proteína: 2g por kg de peso corporal
  v_protein_g := ROUND(v_weight * 2.0);
  -- Grasas esenciales: 0.9g por kg de peso corporal
  v_fats_g    := ROUND(v_weight * 0.9);
  -- Carbohidratos: resto calórico
  v_carbs_g   := GREATEST(90, ROUND((v_target_kcal - (v_protein_g * 4) - (v_fats_g * 9)) / 4.0));
  -- Hidratación: 35ml * peso corporal (redondeado a múltiplos de 100ml)
  v_water_ml  := ROUND((v_weight * 35.0) / 100.0) * 100;

  -- 2. Construcción del Programa Maestro de 3 Días de Fuerza y Postura SENS
  v_day1_ex := jsonb_build_array(
    jsonb_build_object(
      'id', '43bad14a-f720-45bd-8e3e-acdb7a2cd3ec',
      'name', 'Press de Banca Plano con Mancuernas',
      'pattern', 'Empuje Horizontal · Pectoral & Estabilidad Escapular',
      'sets', 3,
      'reps', '8-10',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/43bad14a-f720-45bd-8e3e-acdb7a2cd3ec.mp4',
      'cues', jsonb_build_array(
        'Retraé y deprimí las escápulas contra el banco antes de iniciar el empuje.',
        'Descendé con los codos a 45° del torso para proteger la cápsula anterior del hombro.',
        'Mantené glúteos y planta de los pies firmes contra el suelo.'
      )
    ),
    jsonb_build_object(
      'id', '9e317f1f-4918-4f3e-9c57-eb0adfe7f004',
      'name', 'Press Militar Sentado con Mancuernas',
      'pattern', 'Empuje Vertical · Deltoides & Control Costal',
      'sets', 3,
      'reps', '10',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/9e317f1f-4918-4f3e-9c57-eb0adfe7f004.mp4',
      'cues', jsonb_build_array(
        'Mantené las costillas bajas (cierre costal) sin arquear la zona lumbar.',
        'Empujá en el plano escapular (30° hacia adelante) cuidando el espacio subacromial.',
        'Controlá el descenso en 2 segundos reales hasta la altura del mentón.'
      )
    ),
    jsonb_build_object(
      'id', 'f37de49f-5f7b-4fbf-a392-495f38f7fd1f',
      'name', 'Flexiones de Brazos (Push-ups) con Pausa',
      'pattern', 'Empuje Integrado · Serrato Anterior & Core',
      'sets', 3,
      'reps', '10-12',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/f37de49f-5f7b-4fbf-a392-495f38f7fd1f.mp4',
      'cues', jsonb_build_array(
        'Alineá cabeza, columna dorsal y pelvis en un solo bloque compacto.',
        'Hacé 1 segundo real de pausa abajo sin apoyar el pecho ni perder tensión.',
        'Empujá el suelo separando las escápulas al final del recorrido.'
      )
    ),
    jsonb_build_object(
      'id', '2ae448e6-0a99-4664-898d-bfbf94080b37',
      'name', 'Plancha Frontal con Retroversión Pélvica (RKC)',
      'pattern', 'Core Anti-Extensión · Estabilidad Lumbo-Pélvica',
      'sets', 3,
      'reps', '35s',
      'rir', 'RIR 1',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/2ae448e6-0a99-4664-898d-bfbf94080b37.mp4',
      'cues', jsonb_build_array(
        'Traccioná los codos imaginariamente hacia las puntas de los pies.',
        'Contraé glúteos al máximo para proteger la columna lumbar.',
        'Exhalá profundo activando el transverso abdominal.'
      )
    )
  );

  v_day3_ex := jsonb_build_array(
    jsonb_build_object(
      'id', 'aad15275-4bb0-4459-a180-6c9f5dbe6d95',
      'name', 'Peso Muerto Rumano con Mancuernas',
      'pattern', 'Bisagra de Cadera · Isquiosurales & Glúteos',
      'sets', 3,
      'reps', '8-10',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/aad15275-4bb0-4459-a180-6c9f5dbe6d95.mp4',
      'cues', jsonb_build_array(
        'Iniciá el movimiento proyectando la cadera estrictamente hacia atrás.',
        'Deslizá las mancuernas pegadas a los muslos con dorsales conectados.',
        'Frená el descenso apenas la cadera deje de viajar hacia atrás (columna neutra).'
      )
    ),
    jsonb_build_object(
      'id', '7f93fada-7563-4965-b189-2ffadbd5a967',
      'name', 'Remo con Mancuerna a Una Mano en Banco',
      'pattern', 'Tracción Horizontal · Dorsal Ancho & Romboides',
      'sets', 3,
      'reps', '10 por lado',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/7f93fada-7563-4965-b189-2ffadbd5a967.mp4',
      'cues', jsonb_build_array(
        'Traccioná llevando el codo hacia el bolsillo de la cadera, no hacia el cuello.',
        'Mantené la columna torácica paralela al piso sin rotar el tronco.',
        'Sostené 1 segundo en máxima contracción escapular antes de descender.'
      )
    ),
    jsonb_build_object(
      'id', 'c27c05f6-481a-4791-ac2f-6518b89d0d31',
      'name', 'Kettlebell Swing Estilo Ruso',
      'pattern', 'Potencia de Cadena Posterior · Extensión de Cadera',
      'sets', 3,
      'reps', '15',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/c27c05f6-481a-4791-ac2f-6518b89d0d31.mp4',
      'cues', jsonb_build_array(
        'Impulsá la pesa con un golpe seco de glúteos, no tirando con los hombros.',
        'Esperá a que los antebrazos toquen las ingles antes de inclinar el torso.',
        'Terminá cada repetición en plancha vertical con rodillas y abdomen firmes.'
      )
    ),
    jsonb_build_object(
      'id', 'fe1dba64-4f45-4aa3-bbd2-8266736028a1',
      'name', 'Movilidad Gato-Vaca y Descompresión Espinal',
      'pattern', 'Higiene de Columna · Movilidad Torácica y Lumbar',
      'sets', 3,
      'reps', '10 ciclos lentos',
      'rir', 'Fluido',
      'restSeconds', 60,
      'videoUrl', 'EJERCICIOS/videos_loop_final/fe1dba64-4f45-4aa3-bbd2-8266736028a1.mp4',
      'cues', jsonb_build_array(
        'Articulá vértebra por vértebra iniciando siempre desde la pelvis.',
        'Inhalá profundo expandiendo las costillas en extensión controlada.',
        'Exhalá largo separando las escápulas y descomprimiendo la zona lumbar.'
      )
    )
  );

  v_day5_ex := jsonb_build_array(
    jsonb_build_object(
      'id', 'c43a4011-a963-48cf-8a07-a9f6a5274d00',
      'name', 'Sentadilla Goblet con Mancuerna',
      'pattern', 'Dominante de Rodilla · Cuádriceps & Postura Torácica',
      'sets', 3,
      'reps', '10',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/c43a4011-a963-48cf-8a07-a9f6a5274d00.mp4',
      'cues', jsonb_build_array(
        'Sostené la carga pegada al esternón con los codos apuntando hacia abajo.',
        'Descendé controlado entre tus caderas manteniendo todo el pie apoyado.',
        'Empujá el suelo manteniendo el pecho orgulloso y el core firme.'
      )
    ),
    jsonb_build_object(
      'id', '1c022132-227d-4411-bc96-8e13569090d0',
      'name', 'Hip Thrust con Barra en Banco',
      'pattern', 'Extensión de Cadera · Glúteo Mayor & Estabilidad Pélvica',
      'sets', 3,
      'reps', '10-12',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/1c022132-227d-4411-bc96-8e13569090d0.mp4',
      'cues', jsonb_build_array(
        'Apoyá el borde inferior de las escápulas en el banco y mantené mirada al frente.',
        'Asegurate de que las tibias queden a 90° verticales en el punto alto.',
        'Pausa de 1 segundo arriba con retroversión pélvica sin hiperextender lumbares.'
      )
    ),
    jsonb_build_object(
      'id', 'f9906ab7-1991-41dd-8fc6-be4262039311',
      'name', 'Estocadas Búlgaras con Mancuernas',
      'pattern', 'Fuerza Unilateral · Estabilidad de Cadera y Rodilla',
      'sets', 3,
      'reps', '8-10 por pierna',
      'rir', 'RIR 2',
      'restSeconds', 90,
      'videoUrl', 'EJERCICIOS/videos_loop_final/f9906ab7-1991-41dd-8fc6-be4262039311.mp4',
      'cues', jsonb_build_array(
        'Incliná levemente el torso hacia adelante (15°) para enfatizar cadera y glúteo.',
        'Cargá el 85% del peso sobre la pierna delantera cuidando la alineación de rodilla.',
        'Empujá firme con el talón y mediopié sin rebotar abajo.'
      )
    ),
    jsonb_build_object(
      'id', 'fe1dba64-4f45-4aa3-bbd2-8266736028a1',
      'name', 'Movilidad Gato-Vaca y Descompresión Espinal',
      'pattern', 'Vuelta a la Calma · Descompresión Articular',
      'sets', 2,
      'reps', '10 ciclos lentos',
      'rir', 'Fluido',
      'restSeconds', 60,
      'videoUrl', 'EJERCICIOS/videos_loop_final/fe1dba64-4f45-4aa3-bbd2-8266736028a1.mp4',
      'cues', jsonb_build_array(
        'Respirá nasalmente bajando las pulsaciones tras el bloque de piernas.',
        'Liberá tensión cervical y lumbar con recorrido suave y sin dolor.'
      )
    )
  );

  v_prescribed_workouts := jsonb_build_object(
    'day1', jsonb_build_object(
      'title', 'Día 1: Empuje, Postura & Core',
      'modality', 'Gimnasio / Pesas',
      'exercises', v_day1_ex
    ),
    'day2', jsonb_build_object(
      'title', 'Recuperación Activa & Pasos NEAT',
      'modality', 'Descanso Activo',
      'exercises', '[]'::jsonb
    ),
    'day3', jsonb_build_object(
      'title', 'Día 2: Tracción & Cadena Posterior Cuidada',
      'modality', 'Gimnasio / Pesas',
      'exercises', v_day3_ex
    ),
    'day4', jsonb_build_object(
      'title', 'Recuperación Activa & Movilidad',
      'modality', 'Descanso Activo',
      'exercises', '[]'::jsonb
    ),
    'day5', jsonb_build_object(
      'title', 'Día 3: Piernas, Estabilidad & Descompresión',
      'modality', 'Gimnasio / Pesas',
      'exercises', v_day5_ex
    ),
    'day6', jsonb_build_object(
      'title', 'Actividad Recreativa / Caminata',
      'modality', 'Descanso Activo',
      'exercises', '[]'::jsonb
    ),
    'day7', jsonb_build_object(
      'title', 'Descanso Total',
      'modality', 'Descanso Activo',
      'exercises', '[]'::jsonb
    )
  );

  v_prescribed_nutrition := jsonb_build_object(
    'target_calories', v_target_kcal,
    'target_protein', v_protein_g,
    'target_carbs', v_carbs_g,
    'target_fats', v_fats_g,
    'target_water', v_water_ml,
    'directive_note', format(
      'Prescripción inicial Mifflin-St Jeor (%s kcal · %sg Proteína · %sml Agua). Priorizá alcanzar el piso proteico en 3 a 4 ingestas y completá tus 3 sesiones semanales para desbloquear tu Presupuesto Social de Fin de Semana (+500 kcal libres).',
      v_target_kcal, v_protein_g, v_water_ml
    ),
    'prescribed_foods', jsonb_build_array(
      jsonb_build_object('name', 'Pechuga de Pollo / Carne Magra / Pescado (200g)', 'kcal', 330, 'p', 46, 'c', 0, 'f', 14),
      jsonb_build_object('name', 'Huevos Enteros de Campo (3 unidades)', 'kcal', 215, 'p', 19, 'c', 1, 'f', 15),
      jsonb_build_object('name', 'Yogur Griego Natural + Frutos Rojos + Whey (1 scoop)', 'kcal', 260, 'p', 34, 'c', 18, 'f', 4),
      jsonb_build_object('name', 'Arroz Blanco / Papa Horno + Aceite de Oliva Virgen', 'kcal', 310, 'p', 5, 'c', 48, 'f', 10)
    )
  );

  -- Insertar en public.workouts (modelo relacional)
  INSERT INTO public.workouts (user_id, day_key, title, modality, day_order, exercises, is_auto_prescribed)
  VALUES
    (target_user_id, 'day1', 'Día 1: Empuje, Postura & Core', 'Gimnasio / Pesas', 1, v_day1_ex, TRUE),
    (target_user_id, 'day3', 'Día 2: Tracción & Cadena Posterior Cuidada', 'Gimnasio / Pesas', 2, v_day3_ex, TRUE),
    (target_user_id, 'day5', 'Día 3: Piernas, Estabilidad & Descompresión', 'Gimnasio / Pesas', 3, v_day5_ex, TRUE)
  ON CONFLICT (user_id, day_key) DO UPDATE
    SET title = EXCLUDED.title,
        exercises = EXCLUDED.exercises,
        updated_at = NOW()
    WHERE public.workouts.is_auto_prescribed = TRUE;

  -- Actualizar public.profiles con las metas calculadas y los objetos JSONB de lectura instantánea
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET
    daily_calorie_target = v_target_kcal,
    daily_protein_target_g = v_protein_g,
    daily_carbs_target_g = v_carbs_g,
    daily_fats_target_g = v_fats_g,
    daily_water_ml = v_water_ml,
    prescribed_workouts = v_prescribed_workouts,
    prescribed_nutrition = v_prescribed_nutrition,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'status', 'assigned',
    'daily_calorie_target', v_target_kcal,
    'daily_protein_target_g', v_protein_g,
    'daily_carbs_target_g', v_carbs_g,
    'daily_fats_target_g', v_fats_g,
    'daily_water_ml', v_water_ml
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático: Al pasar onboarding_completed = TRUE, dispara assign_automated_starter_plan
CREATE OR REPLACE FUNCTION public.trg_auto_prescribe_on_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarding_completed = TRUE
     AND (OLD.onboarding_completed IS DISTINCT FROM TRUE OR NEW.prescribed_workouts IS NULL) THEN
    PERFORM public.assign_automated_starter_plan(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_onboarding_auto_prescribe ON public.profiles;
CREATE TRIGGER on_profile_onboarding_auto_prescribe
  AFTER INSERT OR UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW
  WHEN (NEW.onboarding_completed = TRUE)
  EXECUTE FUNCTION public.trg_auto_prescribe_on_onboarding();


-- -----------------------------------------------------------------------------
-- 3. MOTOR DE RACHAS, DESBLOQUEOS Y "PRESUPUESTO SOCIAL DE FIN DE SEMANA"
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlock_key TEXT NOT NULL,
  unlock_title TEXT NOT NULL,
  unlock_category TEXT NOT NULL CHECK (unlock_category IN ('nutrition_refeed', 'bonus_workout', 'habit_guide', 'guest_pass')),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, unlock_key)
);

ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.user_unlocks;
CREATE POLICY "Users can view own unlocks"
  ON public.user_unlocks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Tabla complementaria de recompensas (compatibilidad histórica)
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('extra_trial_days', 'exclusive_protocol', 'store_discount')),
  reward_code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, reward_code)
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rewards" ON public.user_rewards;
CREATE POLICY "Users can view own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Trigger AFTER INSERT ON public.workout_logs:
-- Evalúa racha, progreso semanal, desbloqueo del Protocolo Post-Oficina (1 sesión),
-- Permiso Metabólico SENS de Fin de Semana + Guest Pass (3 sesiones en la semana),
-- y +3 días de acceso si completa Onboarding + 3 sesiones en sus primeros 7 días.
ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW());

CREATE OR REPLACE FUNCTION public.fn_evaluate_workout_streaks_and_unlocks()
RETURNS TRIGGER AS $$
DECLARE
  v_total_workouts INT;
  v_week_workouts INT;
  v_onboarded BOOLEAN;
  v_created_at TIMESTAMPTZ;
  v_already_bonus BOOLEAN;
BEGIN
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  -- Contabilizar entrenamientos totales y de la semana ISO actual
  SELECT COUNT(*) INTO v_total_workouts
  FROM public.workout_logs
  WHERE user_id = NEW.user_id;

  SELECT COUNT(*) INTO v_week_workouts
  FROM public.workout_logs
  WHERE user_id = NEW.user_id
    AND completed_at >= date_trunc('week', NOW());

  -- Actualizar racha y contador semanal en public.profiles
  UPDATE public.profiles
  SET
    streak_days = COALESCE(streak_days, 0) + 1,
    weekly_workouts_completed = v_week_workouts,
    consistency_points = COALESCE(consistency_points, 0) + 25,
    weekend_refeed_unlocked = CASE WHEN v_week_workouts >= 3 THEN TRUE ELSE COALESCE(weekend_refeed_unlocked, FALSE) END,
    updated_at = NOW()
  WHERE id = NEW.user_id
  RETURNING onboarding_completed, created_at INTO v_onboarded, v_created_at;

  -- HITO 1: Al registrar su 1er entrenamiento -> Desbloquea Protocolo 10 min Post-Oficina
  IF v_total_workouts >= 1 THEN
    INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
    VALUES (
      NEW.user_id,
      'protocol_office_decompression',
      'Protocolo 10 min: Descompresión Lumbar y Cervical Post-Oficina',
      'bonus_workout'
    )
    ON CONFLICT (user_id, unlock_key) DO NOTHING;
  END IF;

  -- HITO 2: Al completar 3 entrenamientos en la semana -> Presupuesto Social de Fin de Semana + Guest Pass
  IF v_week_workouts >= 3 THEN
    INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
    VALUES (
      NEW.user_id,
      'weekend_social_refeed',
      'Permiso Metabólico SENS de Fin de Semana: +500 kcal de margen social calculado + Guía para cenar afuera sin perder recomposición',
      'nutrition_refeed'
    )
    ON CONFLICT (user_id, unlock_key) DO NOTHING;

    INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
    VALUES (
      NEW.user_id,
      'sens_friend_guest_pass_14d',
      'Guest Pass SENS: Pase de 14 días para invitar a un amigo a entrenar',
      'guest_pass'
    )
    ON CONFLICT (user_id, unlock_key) DO NOTHING;
  END IF;

  -- HITO 3: Si completa Onboarding + 3 entrenamientos dentro de sus primeros 7 días -> +3 días a trial_ends_at
  IF COALESCE(v_onboarded, FALSE) = TRUE
     AND v_total_workouts >= 3
     AND NOW() <= (COALESCE(v_created_at, NOW()) + INTERVAL '7 days') THEN

    SELECT EXISTS (
      SELECT 1 FROM public.user_unlocks
      WHERE user_id = NEW.user_id AND unlock_key = 'initial_criterio_3days'
    ) INTO v_already_bonus;

    IF NOT v_already_bonus THEN
      INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
      VALUES (
        NEW.user_id,
        'initial_criterio_3days',
        'Recompensa al Criterio Inicial: +3 Días Extra de Acceso Full Desbloqueados',
        'habit_guide'
      )
      ON CONFLICT (user_id, unlock_key) DO NOTHING;

      INSERT INTO public.user_rewards (user_id, reward_type, reward_code, is_claimed)
      VALUES (NEW.user_id, 'extra_trial_days', 'CRITERIO_3D_BONUS', TRUE)
      ON CONFLICT (user_id, reward_code) DO NOTHING;

      UPDATE public.profiles
      SET
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '3 days',
        consistency_points = COALESCE(consistency_points, 0) + 100
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workout_log_check_criterio ON public.workout_logs;
DROP TRIGGER IF EXISTS on_workout_log_streaks_and_unlocks ON public.workout_logs;
CREATE TRIGGER on_workout_log_streaks_and_unlocks
  AFTER INSERT ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_evaluate_workout_streaks_and_unlocks();


-- -----------------------------------------------------------------------------
-- 4. VIRAL LOOP ANTIFRAUDE (public.referrals) Y PASARELA DE PAGOS (public.payment_transactions)
-- -----------------------------------------------------------------------------

-- Normalizador de email antifraude (ignora alias '+' y puntos en Gmail/Googlemail)
CREATE OR REPLACE FUNCTION public.normalize_email_antifraud(raw_email TEXT)
RETURNS TEXT AS $$
DECLARE
  clean TEXT;
  local_part TEXT;
  domain_part TEXT;
BEGIN
  IF raw_email IS NULL OR position('@' in raw_email) = 0 THEN
    RETURN lower(coalesce(raw_email, ''));
  END IF;

  clean := lower(btrim(raw_email));
  local_part := split_part(clean, '@', 1);
  domain_part := split_part(clean, '@', 2);

  local_part := split_part(local_part, '+', 1);

  IF domain_part IN ('gmail.com', 'googlemail.com') THEN
    local_part := replace(local_part, '.', '');
    domain_part := 'gmail.com';
  END IF;

  RETURN local_part || '@' || domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email_normalized TEXT NOT NULL UNIQUE,
  device_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rewarded', 'flagged_fraud')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.is_admin());

-- Evaluador Antifraude de Referidos:
-- Pasa a 'rewarded' (+7 días a trial_ends_at o premium_until para ambos, máx 4 por mes)
-- solo cuando el invitado tiene email normalizado único, distinto device_hash,
-- completó el Onboarding + 1 workout_log + 1 daily_log.
CREATE OR REPLACE FUNCTION public.evaluate_referral_qualification(target_referred_id UUID)
RETURNS VOID AS $$
DECLARE
  ref_rec RECORD;
  referrer_Reward_count_month INT;
  has_onboarded BOOLEAN;
  workout_count INT;
  daily_count INT;
  dup_device_exists BOOLEAN;
BEGIN
  SELECT * INTO ref_rec
  FROM public.referrals
  WHERE referred_id = target_referred_id
    AND status IN ('pending', 'qualified')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF ref_rec.referrer_id = ref_rec.referred_id THEN
    UPDATE public.referrals SET status = 'flagged_fraud' WHERE id = ref_rec.id;
    RETURN;
  END IF;

  IF ref_rec.device_hash IS NOT NULL AND length(btrim(ref_rec.device_hash)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.referrals
      WHERE id <> ref_rec.id
        AND referrer_id = ref_rec.referrer_id
        AND device_hash = ref_rec.device_hash
    ) INTO dup_device_exists;

    IF dup_device_exists THEN
      UPDATE public.referrals SET status = 'flagged_fraud' WHERE id = ref_rec.id;
      RETURN;
    END IF;
  END IF;

  SELECT onboarding_completed INTO has_onboarded
  FROM public.profiles
  WHERE id = target_referred_id;

  SELECT COUNT(*) INTO workout_count
  FROM public.workout_logs
  WHERE user_id = target_referred_id;

  SELECT COUNT(*) INTO daily_count
  FROM public.daily_logs
  WHERE user_id = target_referred_id;

  IF COALESCE(has_onboarded, FALSE) = TRUE AND workout_count >= 1 AND daily_count >= 1 THEN
    -- Tope antifraude: máximo 4 referidos recompensados por mes para el referente
    SELECT COUNT(*) INTO referrer_reward_count_month
    FROM public.referrals
    WHERE referrer_id = ref_rec.referrer_id
      AND status = 'rewarded'
      AND rewarded_at >= date_trunc('month', NOW());

    PERFORM set_config('app.bypass_profile_guard', 'on', true);

    -- +7 días al invitado
    UPDATE public.profiles
    SET
      trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '7 days',
      premium_until = CASE
        WHEN premium_until IS NOT NULL AND premium_until > NOW() THEN premium_until + INTERVAL '7 days'
        ELSE premium_until
      END,
      consistency_points = COALESCE(consistency_points, 0) + 50
    WHERE id = ref_rec.referred_id;

    -- +7 días al invitador (si no superó el tope de 4 en el mes actual)
    IF referrer_reward_count_month < 4 THEN
      UPDATE public.profiles
      SET
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '7 days',
        premium_until = CASE
          WHEN premium_until IS NOT NULL AND premium_until > NOW() THEN premium_until + INTERVAL '7 days'
          ELSE premium_until
        END,
        consistency_points = COALESCE(consistency_points, 0) + 100
      WHERE id = ref_rec.referrer_id;
    END IF;

    UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = NOW()
    WHERE id = ref_rec.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC seguro para vincular referido desde el cliente al registrarse con ?ref=SENS-XXXX
CREATE OR REPLACE FUNCTION public.register_referral_attempt(
  p_referral_code TEXT,
  p_device_hash TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_norm_email TEXT;
  v_referrer_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;
  IF v_user_email IS NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  END IF;

  v_norm_email := public.normalize_email_antifraud(v_user_email);

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE upper(btrim(referral_code)) = upper(btrim(p_referral_code))
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_referral_code');
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET referred_by = COALESCE(referred_by, v_referrer_id)
  WHERE id = v_user_id;

  INSERT INTO public.referrals (referrer_id, referred_id, referred_email_normalized, device_hash, status)
  VALUES (v_referrer_id, v_user_id, v_norm_email, NULLIF(btrim(p_device_hash), ''), 'pending')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'referrer_id', v_referrer_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para evaluar calificación de referido al registrar workout_logs o daily_logs
CREATE OR REPLACE FUNCTION public.trg_check_referral_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.evaluate_referral_qualification(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workout_log_referral_eval ON public.workout_logs;
CREATE TRIGGER on_workout_log_referral_eval
  AFTER INSERT ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_referral_on_activity();

DROP TRIGGER IF EXISTS on_daily_log_referral_eval ON public.daily_logs;
CREATE TRIGGER on_daily_log_referral_eval
  AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_referral_on_activity();

-- Tabla de Transacciones de Pago (Mercado Pago ARS + Lemon Squeezy / Stripe USD)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'lemonsqueezy', 'stripe', 'manual_transfer')),
  external_reference TEXT,
  plan_code TEXT DEFAULT 'app_monthly',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'pending',
  webhook_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can select own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Service role can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Service role can manage payment transactions"
  ON public.payment_transactions FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.is_admin())
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.is_admin());

COMMIT;
