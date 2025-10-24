-- Agendar cálculo de probabilidades para executar diariamente às 4:00 AM UTC (após atualização de dados)
SELECT cron.schedule(
  'daily-probability-calculation',
  '0 4 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/calculate-crypto-probabilities',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbWltbWJudXZjcWxuZGthd2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTIzNDEsImV4cCI6MjA3NTQ2ODM0MX0.xfSm757qR-QrGyC2rYQKhPcB0mwt1cHVSg63nGXq43k"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);