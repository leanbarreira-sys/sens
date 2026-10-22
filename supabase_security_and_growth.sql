-- ==============================================================================
-- MAKES SENS. — MASTER SECURITY, FREEMIUM (7 DAYS), ANTI-FRAUD REFERRALS & GROWTH
-- Architecture: Zero-Trust RLS, Privilege Escalation Guard, Viral Loop & Payments
-- Target: Supabase PostgreSQL (Idempotent Execution)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 0. ADMIN & TRAINER VERIFICATION HELPER (SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT;
  jwt_email TEXT;
  db_role TEXT;
BEGIN
  -- 1. Check service_role bypass (Edge Functions / Webhooks / SQL Editor)
  IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check JWT metadata claims first
  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
  jwt_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

  IF jwt_role IN ('admin', 'coach', 'trainer') OR jwt_email IN ('entrenador@makessens.com', 'nicolas@makessens.com') THEN
    RETURN TRUE;
  END IF;

  -- 3. Verify directly against public.profiles
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO db_role FROM public.profiles WHERE id = auth.uid();
    IF db_role IN ('admin', 'coach', 'trainer') THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;


-- ==============================================================================
-- 1. FREEMIUM ENGINE (7-DAY TRIAL) + PROFILES SCHEMA EVOLUTION
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop legacy restrictive CHECK constraints on role and subscription_status if present
  FOR r IN (
    SELECT con.conname
    FROM pg_catalog.pg_constraint con
    INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%subscription_status%'
        OR pg_get_constraintdef(con.oid) ILIKE '%role%'
      )
  ) LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Add required Freemium, Referral & Gamification columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consistency_points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_weeks INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device_hash TEXT;

-- Ensure default for new rows on subscription_status and trial_ends_at
ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'trial';
ALTER TABLE public.profiles ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Apply updated, backward-compatible CHECK constraints
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('user_normal', 'user_vip', 'admin', 'coach', 'trainer')
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check,
  ADD CONSTRAINT profiles_subscription_status_check CHECK (
    subscription_status IN ('trial', 'active', 'expired', 'vip_manual', 'pending_activation', 'paused', 'past_due', 'canceled')
  );

-- Helper function to generate unique SENS-XXXX referral codes
CREATE OR REPLACE FUNCTION public.generate_sens_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
  exists_flag BOOLEAN;
BEGIN
  LOOP
    candidate := 'SENS-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = candidate) INTO exists_flag;
    IF NOT exists_flag THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

-- Backfill missing referral_code and trial_ends_at on existing profiles
DO $$
DECLARE
  prof RECORD;
BEGIN
  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  FOR prof IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles
    SET referral_code = public.generate_sens_referral_code()
    WHERE id = prof.id;
  END LOOP;

  UPDATE public.profiles
  SET trial_ends_at = COALESCE(created_at, NOW()) + INTERVAL '7 days'
  WHERE trial_ends_at IS NULL;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END $$;

-- Auto-assign referral_code and trial_ends_at on BEFORE INSERT if omitted
CREATE OR REPLACE FUNCTION public.trg_fn_profiles_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    NEW.referral_code := public.generate_sens_referral_code();
  END IF;

  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;

  IF NEW.subscription_status IS NULL OR btrim(NEW.subscription_status) = '' THEN
    NEW.subscription_status := 'trial';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_before_insert ON public.profiles;
CREATE TRIGGER trg_profiles_before_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_profiles_before_insert();


-- ==============================================================================
-- 2. PRIVILEGE ESCALATION PATCH (BEFORE UPDATE ON public.profiles)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow trusted internal triggers (referrals, rewards, webhooks), SQL Editor (auth.uid() IS NULL) or verified Admin/Trainer
  IF current_setting('app.bypass_profile_guard', true) = 'on'
     OR auth.uid() IS NULL
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block unauthorized mutation of privileged columns
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tienes permisos para modificar el campo role.';
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tienes permisos para modificar subscription_status.';
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tienes permisos para modificar trial_ends_at.';
  END IF;

  IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tienes permisos para modificar premium_until.';
  END IF;

  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code AND OLD.referral_code IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: No tienes permisos para modificar tu referral_code.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_protect_profile_sensitive_fields();


-- ==============================================================================
-- 3. ACCESS CONTROL FUNCTION: public.has_active_access(user_uuid UUID)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_role TEXT;
  p_status TEXT;
  p_trial_ends TIMESTAMPTZ;
  p_premium_until TIMESTAMPTZ;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Fast-path for current session admin/trainer
  IF user_uuid = auth.uid() AND public.is_admin() THEN
    RETURN TRUE;
  END IF;

  SELECT role, subscription_status, trial_ends_at, premium_until
    INTO p_role, p_status, p_trial_ends, p_premium_until
  FROM public.profiles
  WHERE id = user_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 1. Admin / Trainer / Coach always has access
  IF p_role IN ('admin', 'trainer', 'coach', 'user_vip') THEN
    RETURN TRUE;
  END IF;

  -- 2. Active or VIP manual subscription with valid window
  IF p_status IN ('active', 'vip_manual') AND (p_premium_until IS NULL OR p_premium_until > NOW()) THEN
    RETURN TRUE;
  END IF;

  -- 3. Within active trial window (7 days + any earned bonus days)
  IF p_trial_ends IS NOT NULL AND NOW() <= p_trial_ends AND p_status NOT IN ('expired', 'canceled') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Enforce public.has_active_access(auth.uid()) on workout_logs and daily_logs write operations
-- (Note: anamnesis remains open to the owner so the mandatory 8-step Onboarding never blocks)
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "WorkoutLogs: acceso total propietario o admin" ON public.workout_logs;
DROP POLICY IF EXISTS "WorkoutLogs: lectura propietario o admin" ON public.workout_logs;
DROP POLICY IF EXISTS "WorkoutLogs: escritura con acceso activo o admin" ON public.workout_logs;

CREATE POLICY "WorkoutLogs: lectura propietario o admin"
  ON public.workout_logs
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "WorkoutLogs: escritura con acceso activo o admin"
  ON public.workout_logs
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin());

DROP POLICY IF EXISTS "WorkoutLogs: actualizacion con acceso activo o admin" ON public.workout_logs;
CREATE POLICY "WorkoutLogs: actualizacion con acceso activo o admin"
  ON public.workout_logs
  FOR UPDATE
  USING ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin())
  WITH CHECK ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin());

DROP POLICY IF EXISTS "WorkoutLogs: borrado propietario o admin" ON public.workout_logs;
CREATE POLICY "WorkoutLogs: borrado propietario o admin"
  ON public.workout_logs
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DailyLogs: acceso total propietario o admin" ON public.daily_logs;
DROP POLICY IF EXISTS "DailyLogs: lectura propietario o admin" ON public.daily_logs;
DROP POLICY IF EXISTS "DailyLogs: escritura con acceso activo o admin" ON public.daily_logs;

CREATE POLICY "DailyLogs: lectura propietario o admin"
  ON public.daily_logs
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "DailyLogs: escritura con acceso activo o admin"
  ON public.daily_logs
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin());

DROP POLICY IF EXISTS "DailyLogs: actualizacion con acceso activo o admin" ON public.daily_logs;
CREATE POLICY "DailyLogs: actualizacion con acceso activo o admin"
  ON public.daily_logs
  FOR UPDATE
  USING ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin())
  WITH CHECK ((auth.uid() = user_id AND public.has_active_access(auth.uid())) OR public.is_admin());

DROP POLICY IF EXISTS "DailyLogs: borrado propietario o admin" ON public.daily_logs;
CREATE POLICY "DailyLogs: borrado propietario o admin"
  ON public.daily_logs
  FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());


-- ==============================================================================
-- 4. ANTI-FRAUD REFERRAL ENGINE (VIRAL LOOP)
-- ==============================================================================
-- Email Normalizer: strips +aliases, lowercases, and normalizes Gmail dots
CREATE OR REPLACE FUNCTION public.normalize_email(raw_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean TEXT;
  local_part TEXT;
  domain_part TEXT;
BEGIN
  IF raw_email IS NULL OR position('@' in raw_email) = 0 THEN
    RETURN LOWER(COALESCE(btrim(raw_email), ''));
  END IF;

  clean := LOWER(btrim(raw_email));
  local_part := split_part(clean, '@', 1);
  domain_part := split_part(clean, '@', 2);

  -- Strip subaddressing (+alias)
  local_part := split_part(local_part, '+', 1);

  -- Normalize Google Mail domains
  IF domain_part IN ('gmail.com', 'googlemail.com') THEN
    local_part := replace(local_part, '.', '');
    domain_part := 'gmail.com';
  END IF;

  RETURN local_part || '@' || domain_part;
END;
$$;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email_normalized TEXT NOT NULL UNIQUE,
  device_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rewarded', 'flagged_fraud')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrals: lectura propia o admin" ON public.referrals;
CREATE POLICY "Referrals: lectura propia o admin"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.is_admin());

DROP POLICY IF EXISTS "Referrals: insercion autenticada de referido" ON public.referrals;
CREATE POLICY "Referrals: insercion autenticada de referido"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referred_id OR public.is_admin());

-- Anti-Fraud & Qualification Engine:
-- Verifies:
-- (a) Normalized email has no +alias in raw email and is unique
-- (b) Distinct device_hash between referrer and referred
-- (c) Referred completed Onboarding + >= 1 workout_log + >= 1 daily_log
-- Caps free referral rewards at 4 per referrer (+7 days to both referrer and referred)
CREATE OR REPLACE FUNCTION public.evaluate_referral_qualification(target_referred_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_rec RECORD;
  referred_prof RECORD;
  referrer_prof RECORD;
  workout_cnt INT := 0;
  daily_cnt INT := 0;
  rewarded_cnt INT := 0;
  norm_email TEXT;
BEGIN
  IF target_referred_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO ref_rec
  FROM public.referrals
  WHERE referred_id = target_referred_id
  FOR UPDATE;

  IF NOT FOUND OR ref_rec.status IN ('rewarded', 'flagged_fraud') THEN
    RETURN;
  END IF;

  SELECT * INTO referred_prof FROM public.profiles WHERE id = ref_rec.referred_id;
  SELECT * INTO referrer_prof FROM public.profiles WHERE id = ref_rec.referrer_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Self-referral check
  IF ref_rec.referrer_id = ref_rec.referred_id THEN
    UPDATE public.referrals SET status = 'flagged_fraud' WHERE id = ref_rec.id;
    RETURN;
  END IF;

  -- (a) Reject explicit '+' alias subaddressing or normalized email collision with referrer
  norm_email := public.normalize_email(referred_prof.email);
  IF position('+' in COALESCE(referred_prof.email, '')) > 0
     OR norm_email = public.normalize_email(referrer_prof.email) THEN
    UPDATE public.referrals SET status = 'flagged_fraud' WHERE id = ref_rec.id;
    RETURN;
  END IF;

  -- (b) Distinct device_hash check (when both hashes are available)
  IF COALESCE(ref_rec.device_hash, referred_prof.device_hash) IS NOT NULL
     AND referrer_prof.device_hash IS NOT NULL
     AND COALESCE(ref_rec.device_hash, referred_prof.device_hash) = referrer_prof.device_hash THEN
    UPDATE public.referrals SET status = 'flagged_fraud' WHERE id = ref_rec.id;
    RETURN;
  END IF;

  -- (c) Activity & Onboarding checks: Onboarding + >=1 workout_log + >=1 daily_log
  IF COALESCE(referred_prof.onboarding_completed, FALSE) IS NOT TRUE THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO workout_cnt
  FROM public.workout_logs
  WHERE user_id = ref_rec.referred_id;

  IF workout_cnt < 1 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO daily_cnt
  FROM public.daily_logs
  WHERE user_id = ref_rec.referred_id;

  IF daily_cnt < 1 THEN
    RETURN;
  END IF;

  -- Mark as qualified first
  UPDATE public.referrals SET status = 'qualified' WHERE id = ref_rec.id;

  -- Check referrer cap (max 4 rewarded referrals per user)
  SELECT COUNT(*) INTO rewarded_cnt
  FROM public.referrals
  WHERE referrer_id = ref_rec.referrer_id
    AND status = 'rewarded';

  IF rewarded_cnt >= 4 THEN
    -- Stays in 'qualified' state if referrer already hit the 4-referral cap
    RETURN;
  END IF;

  -- Grant +7 days to both Referrer and Referred (with internal guard bypass)
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  -- Update Referrer (+7 days to premium_until if active subscriber, else trial_ends_at)
  UPDATE public.profiles
  SET
    premium_until = CASE
      WHEN subscription_status IN ('active', 'vip_manual') AND premium_until IS NOT NULL
      THEN GREATEST(premium_until, NOW()) + INTERVAL '7 days'
      ELSE premium_until
    END,
    trial_ends_at = CASE
      WHEN subscription_status NOT IN ('active', 'vip_manual') OR premium_until IS NULL
      THEN GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '7 days'
      ELSE trial_ends_at
    END,
    consistency_points = COALESCE(consistency_points, 0) + 50,
    updated_at = NOW()
  WHERE id = ref_rec.referrer_id;

  -- Update Referred (+7 days to trial_ends_at or premium_until)
  UPDATE public.profiles
  SET
    premium_until = CASE
      WHEN subscription_status IN ('active', 'vip_manual') AND premium_until IS NOT NULL
      THEN GREATEST(premium_until, NOW()) + INTERVAL '7 days'
      ELSE premium_until
    END,
    trial_ends_at = CASE
      WHEN subscription_status NOT IN ('active', 'vip_manual') OR premium_until IS NULL
      THEN GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '7 days'
      ELSE trial_ends_at
    END,
    consistency_points = COALESCE(consistency_points, 0) + 50,
    updated_at = NOW()
  WHERE id = ref_rec.referred_id;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  UPDATE public.referrals
  SET status = 'rewarded',
      rewarded_at = NOW()
  WHERE id = ref_rec.id;
END;
$$;


-- ==============================================================================
-- 5. QUIET LUXURY GAMIFICATION ENGINE (MILESTONES & REWARDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('extra_trial_days', 'exclusive_protocol', 'store_discount')),
  reward_code TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, reward_code)
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rewards: lectura propia o admin" ON public.user_rewards;
CREATE POLICY "Rewards: lectura propia o admin"
  ON public.user_rewards
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- "Recompensa al Criterio": Automatically grants +3 extra trial days if user completes
-- Onboarding + 3 workouts within their first 7 days of registration.
CREATE OR REPLACE FUNCTION public.evaluate_criterio_milestone(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prof RECORD;
  workout_cnt INT := 0;
  already_unlocked BOOLEAN := FALSE;
BEGIN
  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE id = target_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Must have completed Onboarding and be within first 7 days of registration
  IF COALESCE(prof.onboarding_completed, FALSE) IS NOT TRUE THEN
    RETURN;
  END IF;

  IF NOW() > (COALESCE(prof.created_at, NOW()) + INTERVAL '7 days') THEN
    RETURN;
  END IF;

  -- Check if already rewarded
  SELECT EXISTS (
    SELECT 1 FROM public.user_rewards
    WHERE user_id = target_user_id
      AND reward_code = 'CRITERIO_3_DAYS'
  ) INTO already_unlocked;

  IF already_unlocked THEN
    RETURN;
  END IF;

  -- Count workouts logged within first 7 days
  SELECT COUNT(*) INTO workout_cnt
  FROM public.workout_logs
  WHERE user_id = target_user_id;

  IF workout_cnt < 3 THEN
    RETURN;
  END IF;

  -- Insert reward record (marked as claimed immediately since +3 days are applied automatically)
  INSERT INTO public.user_rewards (user_id, reward_type, reward_code, unlocked_at, is_claimed)
  VALUES (target_user_id, 'extra_trial_days', 'CRITERIO_3_DAYS', NOW(), TRUE)
  ON CONFLICT (user_id, reward_code) DO NOTHING;

  -- Add +3 days to trial_ends_at and +30 consistency points
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  UPDATE public.profiles
  SET
    trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + INTERVAL '3 days',
    consistency_points = COALESCE(consistency_points, 0) + 30,
    updated_at = NOW()
  WHERE id = target_user_id;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
END;
$$;


-- ==============================================================================
-- 6. AUTOMATED TRIGGERS FOR REFERRALS & GAMIFICATION MILESTONES
-- ==============================================================================
-- Trigger on profiles AFTER UPDATE (when onboarding_completed or device_hash updates)
CREATE OR REPLACE FUNCTION public.trg_fn_after_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync device_hash into pending referral row if updated
  IF NEW.device_hash IS DISTINCT FROM OLD.device_hash AND NEW.device_hash IS NOT NULL THEN
    UPDATE public.referrals
    SET device_hash = NEW.device_hash
    WHERE referred_id = NEW.id AND device_hash IS NULL;
  END IF;

  IF NEW.onboarding_completed IS TRUE AND COALESCE(OLD.onboarding_completed, FALSE) IS FALSE THEN
    PERFORM public.evaluate_criterio_milestone(NEW.id);
    PERFORM public.evaluate_referral_qualification(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_profile_activity ON public.profiles;
CREATE TRIGGER trg_after_profile_activity
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_after_profile_activity();

-- Trigger on workout_logs AFTER INSERT
CREATE OR REPLACE FUNCTION public.trg_fn_after_workout_log_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_criterio_milestone(NEW.user_id);
  PERFORM public.evaluate_referral_qualification(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_workout_log_insert ON public.workout_logs;
CREATE TRIGGER trg_after_workout_log_insert
  AFTER INSERT ON public.workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_after_workout_log_insert();

-- Trigger on daily_logs AFTER INSERT OR UPDATE
CREATE OR REPLACE FUNCTION public.trg_fn_after_daily_log_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_referral_qualification(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_daily_log_upsert ON public.daily_logs;
CREATE TRIGGER trg_after_daily_log_upsert
  AFTER INSERT OR UPDATE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_after_daily_log_upsert();


-- RPC Helper to register a referral safely from Frontend during Signup / Onboarding
CREATE OR REPLACE FUNCTION public.register_referral_use(
  p_referral_code TEXT,
  p_device_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_referrer_id UUID;
  v_user_email TEXT;
  v_norm_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  IF p_referral_code IS NULL OR btrim(p_referral_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE UPPER(referral_code) = UPPER(btrim(p_referral_code))
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_referral_code');
  END IF;

  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;
  v_norm_email := public.normalize_email(v_user_email);

  PERFORM set_config('app.bypass_profile_guard', 'on', true);
  UPDATE public.profiles
  SET referred_by = COALESCE(referred_by, v_referrer_id),
      device_hash = COALESCE(p_device_hash, device_hash)
  WHERE id = v_user_id;
  PERFORM set_config('app.bypass_profile_guard', 'off', true);

  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referred_email_normalized,
    device_hash,
    status
  )
  VALUES (
    v_referrer_id,
    v_user_id,
    v_norm_email,
    p_device_hash,
    CASE WHEN position('+' in COALESCE(v_user_email, '')) > 0 THEN 'flagged_fraud' ELSE 'pending' END
  )
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'referrer_id', v_referrer_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$;


-- Update auth.users signup trigger to initialize 7-day trial, referral code & referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_id UUID;
  v_device_hash TEXT;
BEGIN
  PERFORM set_config('app.bypass_profile_guard', 'on', true);

  v_ref_code := NULLIF(UPPER(btrim(COALESCE(NEW.raw_user_meta_data->>'referred_by_code', ''))), '');
  v_device_hash := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'device_hash', '')), '');

  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE UPPER(referral_code) = v_ref_code
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    subscription_status,
    trial_ends_at,
    referral_code,
    referred_by,
    device_hash
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN LOWER(NEW.email) IN ('entrenador@makessens.com', 'nicolas@makessens.com') THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'user_normal')
    END,
    'trial',
    NOW() + INTERVAL '7 days',
    public.generate_sens_referral_code(),
    v_referrer_id,
    v_device_hash
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code),
    trial_ends_at = COALESCE(public.profiles.trial_ends_at, EXCLUDED.trial_ends_at);

  IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referred_email_normalized,
      device_hash,
      status
    )
    VALUES (
      v_referrer_id,
      NEW.id,
      public.normalize_email(NEW.email),
      v_device_hash,
      CASE WHEN position('+' in COALESCE(NEW.email, '')) > 0 THEN 'flagged_fraud' ELSE 'pending' END
    )
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', 'off', true);
  RETURN NEW;
END;
$$;


-- ==============================================================================
-- 7. PAYMENT GATEWAYS ARCHITECTURE (MERCADO PAGO AR + LEMONSQUEEZY / STRIPE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'lemonsqueezy', 'manual_transfer')),
  external_reference TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'pending',
  webhook_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_ref ON public.payment_transactions(external_reference);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can ONLY SELECT their own payment records (or Admin/Trainer for financial audit)
DROP POLICY IF EXISTS "Payments: lectura propia o admin" ON public.payment_transactions;
CREATE POLICY "Payments: lectura propia o admin"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- ONLY service_role can INSERT or UPDATE payment transactions (Webhooks / Server)
DROP POLICY IF EXISTS "Payments: insercion exclusiva service_role" ON public.payment_transactions;
CREATE POLICY "Payments: insercion exclusiva service_role"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Payments: actualizacion exclusiva service_role" ON public.payment_transactions;
CREATE POLICY "Payments: actualizacion exclusiva service_role"
  ON public.payment_transactions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
