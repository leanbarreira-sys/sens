-- ==============================================================================
-- SENS: ELIMINACIÓN COMPLETA DE ALUMNO POR COACH/ADMIN (DB + AUTH.USERS)
-- ==============================================================================
-- Ejecutar una sola vez en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.admin_delete_athlete_complete(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_role TEXT;
  v_target_email TEXT;
BEGIN
  -- 1. Guardia estricta: solo Admin / Coach autenticado puede ejecutar
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Solo el Coach/Admin puede eliminar alumnos.';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: target_user_id requerido.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN: No podés eliminar tu propia cuenta de Coach.';
  END IF;

  SELECT role, email INTO v_target_role, v_target_email
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_target_role IN ('admin', 'coach') THEN
    RAISE EXCEPTION 'FORBIDDEN: No se puede eliminar una cuenta de administración/coach.';
  END IF;

  -- 2. Limpiar todas las tablas relacionadas (idempotente si alguna no existe)
  DELETE FROM public.workout_logs WHERE user_id = target_user_id;
  DELETE FROM public.daily_logs WHERE user_id = target_user_id;
  DELETE FROM public.workout_plan_items WHERE plan_id IN (
    SELECT id FROM public.user_workout_plans WHERE user_id = target_user_id
  );
  DELETE FROM public.user_workout_plans WHERE user_id = target_user_id;
  DELETE FROM public.user_nutrition_guidelines WHERE user_id = target_user_id;
  DELETE FROM public.anamnesis WHERE user_id = target_user_id;
  DELETE FROM public.posture_evaluations WHERE user_id = target_user_id;
  DELETE FROM public.payment_transactions WHERE user_id = target_user_id;

  BEGIN
    DELETE FROM public.user_unlocks WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.user_rewards WHERE user_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.referrals WHERE referrer_id = target_user_id OR referred_id = target_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 3. Eliminar también de auth.users para que no pueda volver a loguearse
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_user_id', target_user_id,
    'email', COALESCE(v_target_email, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_athlete_complete(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_athlete_complete(UUID) TO authenticated;
