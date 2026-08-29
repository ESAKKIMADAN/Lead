-- Enable the pg_net extension to make HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable the pg_cron extension to schedule tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up the cron job to run every minute
-- It calls the send-due-notifications Edge Function.
-- Replace <PROJECT_REF> with your actual Supabase project reference.
-- The authorization header uses the anon key or service role key. Ensure you configure it properly or pass it as a secret.

SELECT cron.schedule(
  'process-due-notifications',
  '* * * * *', -- Every minute
  $$
    SELECT net.http_post(
      url:='https://<PROJECT_REF>.supabase.co/functions/v1/send-due-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);
