-- Schedule daily czar-uploads cleanup (deletes files older than 30 days).
-- Requires pg_cron + pg_net extensions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop any prior schedule with the same name (idempotent re-runs).
do $$
begin
  perform cron.unschedule('czar-storage-cleanup-daily');
exception when others then
  -- ignore: job didn't exist yet
  null;
end $$;

select cron.schedule(
  'czar-storage-cleanup-daily',
  '17 3 * * *',  -- 03:17 UTC daily
  $$
  select net.http_post(
    url := 'https://mmhpmfgzkjqefpihnzpx.supabase.co/functions/v1/czar-storage-cleanup',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1taHBtZmd6a2pxZWZwaWhuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjA1MDcsImV4cCI6MjA5MTU5NjUwN30.v5GRrKgqpG0NggJXHXCI5TPIlUHoHvyecvHJlsufuZ8"}'::jsonb,
    body := jsonb_build_object('time', now())
  );
  $$
);