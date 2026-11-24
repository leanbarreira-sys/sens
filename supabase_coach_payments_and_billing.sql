-- ==============================================================================
-- SENS: HISTORIAL DE PAGOS, VENCIMIENTOS & AUTO-PAUSADO PARA COACH OS
-- ==============================================================================
-- Ejecutar en el SQL Editor de Supabase de forma idempotente.

-- 1. Asegurar columnas de vencimiento y estado en public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'pending_activation';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check,
  ADD CONSTRAINT profiles_subscription_status_check CHECK (
    subscription_status IN ('trial', 'active', 'expired', 'vip_manual', 'pending_activation', 'paused', 'past_due', 'canceled')
  );

-- 2. Asegurar tabla public.payment_transactions y permitir 'cash' como método
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual_transfer',
  external_reference TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'approved',
  webhook_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_provider_check,
  ADD CONSTRAINT payment_transactions_provider_check CHECK (
    provider IN ('mercadopago', 'lemonsqueezy', 'manual_transfer', 'cash')
  );

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS: lectura propia o Coach/Admin; escritura Coach/Admin o service_role
DROP POLICY IF EXISTS "Payments: lectura propia o admin" ON public.payment_transactions;
CREATE POLICY "Payments: lectura propia o admin"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Payments: insercion admin o service_role" ON public.payment_transactions;
CREATE POLICY "Payments: insercion admin o service_role"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Payments: actualizacion admin o service_role" ON public.payment_transactions;
CREATE POLICY "Payments: actualizacion admin o service_role"
  ON public.payment_transactions
  FOR UPDATE
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "Payments: eliminacion admin o service_role" ON public.payment_transactions;
CREATE POLICY "Payments: eliminacion admin o service_role"
  ON public.payment_transactions
  FOR DELETE
  USING (auth.role() = 'service_role' OR public.is_admin());
