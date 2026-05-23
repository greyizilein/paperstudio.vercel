-- czar_user_memory: stores persistent user facts for CZAR long-term memory
create table if not exists public.czar_user_memory (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  facts     jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.czar_user_memory enable row level security;

create policy "Users can read their own memory"
  on public.czar_user_memory for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own memory"
  on public.czar_user_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own memory"
  on public.czar_user_memory for update
  using (auth.uid() = user_id);

-- Service role can do everything (for edge function writes)
create policy "Service role full access"
  on public.czar_user_memory for all
  using (auth.role() = 'service_role');
