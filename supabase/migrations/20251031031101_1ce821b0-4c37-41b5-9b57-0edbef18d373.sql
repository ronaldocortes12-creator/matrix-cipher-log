-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remover cron job existente se houver
SELECT cron.unschedule('crypto-update-every-5-minutes') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'crypto-update-every-5-minutes'
);

-- Criar cron job para executar a cada 5 minutos
-- Este job chama a edge function update-crypto-data que por sua vez já chama calculate-crypto-probabilities
SELECT cron.schedule(
  'crypto-update-every-5-minutes',
  '*/5 * * * *', -- a cada 5 minutos
  $$
  SELECT
    net.http_post(
      url := 'https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/update-crypto-data',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbWltbWJudXZjcWxuZGthd2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTIzNDEsImV4cCI6MjA3NTQ2ODM0MX0.xfSm757qR-QrGyC2rYQKhPcB0mwt1cHVSg63nGXq43k'
      ),
      body := jsonb_build_object(
        'timestamp', now()::text,
        'trigger', 'cron'
      )
    ) as request_id;
  $$
);

-- Criar tabela para registrar execuções do cron job
CREATE TABLE IF NOT EXISTS public.cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_cron_execution_logs_executed_at ON public.cron_execution_logs(executed_at DESC);

-- Habilitar RLS
ALTER TABLE public.cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins podem ver logs
CREATE POLICY "Apenas admins podem visualizar logs de cron"
  ON public.cron_execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'::public.app_role
    )
  );

-- Função para limpar logs antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.cron_execution_logs 
  WHERE executed_at < now() - INTERVAL '30 days';
END;
$$;

-- Agendar limpeza de logs para executar diariamente à meia-noite
SELECT cron.schedule(
  'cleanup-cron-logs-daily',
  '0 0 * * *', -- todo dia à meia-noite
  $$
  SELECT public.cleanup_old_cron_logs();
  $$
);