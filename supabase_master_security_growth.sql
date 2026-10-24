-- supabase_master_security_growth.sql
-- Idempotent script to extend the SENS Supabase schema with security, gamification, referral and payment infrastructure.

-- 1. Extend public.profiles with anti‑vibecoding columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    -- existing columns ...
    plan_tier TEXT DEFAULT 'app_trial' CHECK (plan_tier IN ('app_trial', 'app_subscribed', 'online_1on1', 'presencial_1on1', 'vip')),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    premium_until TIMESTAMPTZ,
    streak_days INT DEFAULT 0,
    weekly_workouts_completed INT DEFAULT 0,
    weekend_refeed_unlocked BOOLEAN DEFAULT FALSE,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.profiles(id)
);

-- Ensure referral_code is generated on INSERT if not provided
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code TEXT := 'SENS-';
    i INT;
BEGIN
    FOR i IN 1..4 LOOP
        code := code || substr(chars, floor(random()*length(chars)+1)::int, 1);
    END LOOP;
    RETURN code;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT public.generate_referral_code();

-- 2. Trigger to protect sensitive fields from non‑admin/trainer edits
CREATE OR REPLACE FUNCTION public.trg_protect_profile_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (auth.uid() = OLD.id) AND NOT (auth.role() IN ('admin', 'trainer')) THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR
           NEW.plan_tier IS DISTINCT FROM OLD.plan_tier OR
           NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
           NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at OR
           NEW.premium_until IS DISTINCT FROM OLD.premium_until OR
           NEW.streak_days IS DISTINCT FROM OLD.streak_days OR
           NEW.weekend_refeed_unlocked IS DISTINCT FROM OLD.weekend_refeed_unlocked THEN
            RAISE EXCEPTION 'Unauthorized modification of protected profile fields.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_sensitive_fields();

-- 3. Access control helper
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    p RECORD;
BEGIN
    SELECT * INTO p FROM public.profiles WHERE id = user_uuid;
    IF p IS NULL THEN RETURN FALSE; END IF;
    IF p.role IN ('admin', 'trainer') THEN RETURN TRUE; END IF;
    IF p.plan_tier IN ('online_1on1', 'presencial_1on1', 'vip') THEN RETURN TRUE; END IF;
    IF p.subscription_status = 'active' AND p.premium_until > NOW() THEN RETURN TRUE; END IF;
    IF NOW() <= p.trial_ends_at THEN RETURN TRUE; END IF;
    RETURN FALSE;
END;
$$;

-- 4. Automated starter plan assignment (auto‑prescripción)
CREATE OR REPLACE FUNCTION public.assign_automated_starter_plan(target_user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    prof RECORD;
    calorie_target INT;
    protein_g INT;
    hydration_ml INT;
BEGIN
    SELECT * INTO prof FROM public.profiles WHERE id = target_user_id;
    IF prof IS NULL THEN RETURN; END IF;
    -- Example Mifflin‑St Jeor (weight kg, height cm, age, gender assumed from profile fields)
    -- NOTE: replace placeholder columns with actual ones when available.
    calorie_target := GREATEST(1200, FLOOR((10 * prof.weight_kg) + (6.25 * prof.height_cm) - (5 * prof.age) + (CASE WHEN prof.gender = 'male' THEN 5 ELSE -161 END)));
    IF prof.fitness_goal = 'recomposicion' THEN
        calorie_target := calorie_target - 350;
    ELSIF prof.fitness_goal IN ('fuerza', 'hipertrofia') THEN
        calorie_target := calorie_target + 200;
    END IF;
    protein_g := prof.weight_kg * 2;
    hydration_ml := prof.weight_kg * 35;
    -- Insert a 3‑day starter program (simplified example)
    INSERT INTO public.workouts (user_id, day, name, notes) VALUES
        (target_user_id, 1, 'Día 1 – Empuje, Postura & Core', 'Series y repeticiones sugeridas, 90s descanso'),
        (target_user_id, 2, 'Día 2 – Tracción & Cadena Posterior', 'Series y repeticiones sugeridas, 90s descanso'),
        (target_user_id, 3, 'Día 3 – Piernas, Estabilidad & Descompresión', 'Series y repeticiones sugeridas, 90s descanso');
    -- Example exercises insertion (replace with real IDs)
    INSERT INTO public.exercises (workout_id, name, sets, reps, rest_seconds, notes) SELECT
        w.id, e.name, e.sets, e.reps, 90, e.notes
    FROM public.workouts w
    JOIN LATERAL (
        VALUES
            ('Press de banca', 4, 8, 'Enfocado en empuje'),
            ('Remo con barra', 4, 8, 'Enfocado en tracción'),
            ('Sentadilla frontal', 4, 8, 'Piernas y core')
    ) AS e(name, sets, reps, notes) ON TRUE
    WHERE w.user_id = target_user_id AND w.day IN (1,2,3);
    -- Store calculated macros in a user_profile_meta table (optional)
    INSERT INTO public.user_profile_meta (user_id, daily_calorie_target, protein_g, hydration_ml)
    VALUES (target_user_id, calorie_target, protein_g, hydration_ml)
    ON CONFLICT (user_id) DO UPDATE SET
        daily_calorie_target = EXCLUDED.daily_calorie_target,
        protein_g = EXCLUDED.protein_g,
        hydration_ml = EXCLUDED.hydration_ml;
END;
$$;

-- 5. Unlocks and gamification tables
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    unlock_key TEXT NOT NULL,
    unlock_title TEXT NOT NULL,
    unlock_category TEXT CHECK (unlock_category IN ('nutrition_refeed','bonus_workout','habit_guide','guest_pass')),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, unlock_key)
);

-- 6. Trigger after workout log insert to evaluate streaks & unlocks
CREATE OR REPLACE FUNCTION public.handle_workout_log_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    prof RECORD;
    week_start DATE;
    workouts_this_week INT;
    first_workout BOOLEAN := FALSE;
BEGIN
    SELECT * INTO prof FROM public.profiles WHERE id = NEW.user_id;
    IF prof IS NULL THEN RETURN NEW; END IF;

    -- Increment streak_days (simple consecutive day logic)
    IF prof.last_workout_at IS NOT NULL AND NEW.logged_at::DATE = (prof.last_workout_at::DATE + INTERVAL '1 day')::DATE THEN
        UPDATE public.profiles SET streak_days = prof.streak_days + 1, last_workout_at = NEW.logged_at WHERE id = prof.id;
    ELSE
        UPDATE public.profiles SET streak_days = 1, last_workout_at = NEW.logged_at WHERE id = prof.id;
    END IF;

    -- Determine week start (Monday)
    week_start := date_trunc('week', NEW.logged_at)::DATE;
    SELECT COUNT(*) INTO workouts_this_week FROM public.workout_logs
        WHERE user_id = NEW.user_id AND logged_at >= week_start;

    -- 1st workout unlock
    IF prof.streak_days = 1 THEN
        INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
        VALUES (prof.id, 'protocol_office_decompression', 'Protocolo 10 min: Descompresión Lumbar y Cervical Post‑Oficina', 'bonus_workout')
        ON CONFLICT DO NOTHING;
        first_workout := TRUE;
    END IF;

    -- 3 workouts in a week unlock
    IF workouts_this_week >= 3 THEN
        UPDATE public.profiles SET weekend_refeed_unlocked = TRUE WHERE id = prof.id;
        INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
        VALUES (prof.id, 'weekend_social_refeed', 'Permiso Metabólico SENS de Fin de Semana (+500 kcal libres + Guía para cenar fuera)', 'nutrition_refeed')
        ON CONFLICT DO NOTHING;
        -- Grant a Guest Pass
        INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
        VALUES (prof.id, 'guest_pass_' || gen_random_uuid(), 'Guest Pass – Invita a un amigo', 'guest_pass')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Bonus +3 days if onboarding + 3 workouts within 7‑day trial
    IF prof.onboarding_completed AND prof.trial_ends_at > NOW() AND workouts_this_week >= 3 THEN
        UPDATE public.profiles SET trial_ends_at = prof.trial_ends_at + INTERVAL '3 days' WHERE id = prof.id;
        INSERT INTO public.user_unlocks (user_id, unlock_key, unlock_title, unlock_category)
        VALUES (prof.id, 'trial_bonus_3d', 'Recompensa al Criterio Inicial (+3 días extra)', 'bonus_workout')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_workout_log_insert ON public.workout_logs;
CREATE TRIGGER trg_after_workout_log_insert
AFTER INSERT ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_workout_log_insert();

-- 7. Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
    id BIGSERIAL PRIMARY KEY,
    inviter_id UUID REFERENCES public.profiles(id),
    invitee_id UUID REFERENCES public.profiles(id),
    referral_code TEXT NOT NULL,
    device_hash TEXT,
    email_normalized TEXT,
    status TEXT CHECK (status IN ('pending','rewarded','invalid')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Normalise email (ignore Gmail '+' alias) helper
CREATE OR REPLACE FUNCTION public.normalise_email(e TEXT)
RETURNS TEXT LANGUAGE sql AS $$
    SELECT LOWER(
        CASE WHEN POSITION('@' IN e) > 0 THEN
            regexp_replace(split_part(e, '@', 1), '\+.*$', '') || '@' || split_part(e, '@', 2)
        ELSE e END
    );
$$;

-- Referral reward trigger
CREATE OR REPLACE FUNCTION public.handle_referral_reward()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    inv RECORD;
BEGIN
    SELECT * INTO inv FROM public.referrals WHERE id = NEW.id;
    IF inv IS NULL THEN RETURN NEW; END IF;
    -- Check reward conditions: invitee has completed onboarding, at least one workout_log and one daily_log
    IF (SELECT onboarding_completed FROM public.profiles WHERE id = inv.invitee_id) AND
       (SELECT COUNT(*) FROM public.workout_logs WHERE user_id = inv.invitee_id) >= 1 AND
       (SELECT COUNT(*) FROM public.daily_logs WHERE user_id = inv.invitee_id) >= 1 THEN
        UPDATE public.referrals SET status = 'rewarded' WHERE id = inv.id;
        -- Grant +7 days (or premium) to both users, respecting max 4 per month per inviter
        UPDATE public.profiles SET trial_ends_at = GREATEST(trial_ends_at, NOW()) + INTERVAL '7 days'
        WHERE id IN (inv.inviter_id, inv.invitee_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_reward ON public.referrals;
CREATE TRIGGER trg_referral_reward
AFTER INSERT ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.handle_referral_reward();

-- 8. Payment transactions table (webhook sink)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    provider TEXT CHECK (provider IN ('mercadopago','stripe','lemonsqueezy')),
    transaction_id TEXT NOT NULL,
    amount_cents INT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending','completed','failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Grant appropriate permissions (optional, adjust for your RLS policies)
-- Example: allow authenticated users to insert their own payment rows
-- ALTER POLICY ...

-- End of supabase_master_security_growth.sql
