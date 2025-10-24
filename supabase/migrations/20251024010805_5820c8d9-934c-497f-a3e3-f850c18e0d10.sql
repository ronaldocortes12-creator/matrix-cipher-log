-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the crypto data update to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'daily-crypto-update',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ddmimmbnuvcqlndkawar.supabase.co/functions/v1/update-crypto-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbWltbWJudXZjcWxuZGthd2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTIzNDEsImV4cCI6MjA3NTQ2ODM0MX0.xfSm757qR-QrGyC2rYQKhPcB0mwt1cHVSg63nGXq43k"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);