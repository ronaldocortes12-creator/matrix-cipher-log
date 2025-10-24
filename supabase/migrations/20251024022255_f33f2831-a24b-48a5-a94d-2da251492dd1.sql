-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para atualizar dados diariamente às 00:00 UTC
SELECT cron.schedule(
  'update-crypto-data-daily',
  '0 0 * * *', -- Todos os dias à meia-noite UTC
  $$
  SELECT
    net.http_post(
      url:='https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/update-crypto-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbWltbWJudXZjcWxuZGthd2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTIzNDEsImV4cCI6MjA3NTQ2ODM0MX0.xfSm757qR-QrGyC2rYQKhPcB0mwt1cHVSg63nGXq43k"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);