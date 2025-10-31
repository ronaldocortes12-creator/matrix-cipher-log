-- ╔════════════════════════════════════════════════════════════════════╗
-- ║           MIGRATION DE SEGURANÇA E CORREÇÕES CRÍTICAS - V2         ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- 1. CORRIGIR SEARCH_PATH DAS FUNÇÕES EXISTENTES
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_block_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. CRIAR TABELA DE RATE LIMITING
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ip_address, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.api_rate_limits(ip_address, endpoint, window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR TABELA DE HEALTH CHECKS
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  details JSONB DEFAULT '{}'::jsonb,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_recent 
ON public.system_health_checks(check_type, created_at DESC);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Health checks são públicos" 
ON public.system_health_checks 
FOR SELECT 
USING (true);

-- 4. CRIAR FUNÇÃO DE VALIDAÇÃO DE DADOS DE CRYPTO
CREATE OR REPLACE FUNCTION public.validate_crypto_probability_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.final_probability < 0 OR NEW.final_probability > 1 THEN
    RAISE EXCEPTION 'final_probability deve estar entre 0 e 1';
  END IF;
  
  IF NEW.price_component < 0 OR NEW.price_component > 1 THEN
    RAISE EXCEPTION 'price_component deve estar entre 0 e 1';
  END IF;
  
  IF NEW.market_cap_component < 0 OR NEW.market_cap_component > 1 THEN
    RAISE EXCEPTION 'market_cap_component deve estar entre 0 e 1';
  END IF;
  
  IF NEW.current_price IS NOT NULL AND NEW.current_price <= 0 THEN
    RAISE EXCEPTION 'current_price deve ser positivo';
  END IF;
  
  IF NEW.direction NOT IN ('alta', 'queda') THEN
    RAISE EXCEPTION 'direction deve ser alta ou queda';
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_crypto_data ON public.crypto_probabilities;
CREATE TRIGGER validate_crypto_data
  BEFORE INSERT OR UPDATE ON public.crypto_probabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_crypto_probability_data();

-- 5. CRIAR FUNÇÃO DE CLEANUP
CREATE OR REPLACE FUNCTION public.cleanup_old_crypto_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.crypto_probabilities WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM public.api_rate_limits WHERE window_start < now() - INTERVAL '24 hours';
  DELETE FROM public.system_health_checks WHERE created_at < now() - INTERVAL '7 days';
END;
$function$;

-- 6. CRIAR FUNÇÃO DE HEALTH CHECK
CREATE OR REPLACE FUNCTION public.system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result JSONB;
  v_crypto_count INTEGER;
  v_last_calc TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT COUNT(*), MAX(created_at) INTO v_crypto_count, v_last_calc
  FROM public.crypto_probabilities
  WHERE created_at > now() - INTERVAL '4 hours';
  
  v_result := jsonb_build_object(
    'status', CASE WHEN v_crypto_count > 0 THEN 'healthy' ELSE 'degraded' END,
    'timestamp', now(),
    'crypto_data_count', v_crypto_count,
    'last_calculation', v_last_calc
  );
  
  INSERT INTO public.system_health_checks (check_type, status, details)
  VALUES ('system', CASE WHEN v_crypto_count > 0 THEN 'healthy' ELSE 'degraded' END, v_result);
  
  RETURN v_result;
END;
$function$;