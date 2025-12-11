-- Função para expirar assinaturas automaticamente
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Atualizar assinaturas expiradas
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND expires_at < now();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  -- Registrar log da execução
  INSERT INTO public.cron_execution_logs (job_name, status, details)
  VALUES (
    'expire-subscriptions',
    'success',
    jsonb_build_object(
      'expired_count', v_expired_count,
      'executed_at', now()
    )
  );
END;
$$;