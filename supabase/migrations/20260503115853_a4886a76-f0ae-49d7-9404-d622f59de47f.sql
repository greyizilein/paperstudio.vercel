create table if not exists public.document_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid null,
  original_storage_path text not null,
  original_filename text not null,
  original_format text not null default 'docx',
  parsed_text text not null default '',
  annotations jsonb not null default '{"tracked_insertions":[],"tracked_deletions":[],"comments":[]}'::jsonb,
  corrected_html text not null default '',
  correction_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_corrections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'document_corrections'
      and policyname = 'Users manage own document corrections'
  ) then
    create policy "Users manage own document corrections"
      on public.document_corrections
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists document_corrections_user_id_idx
  on public.document_corrections (user_id);

create index if not exists document_corrections_conversation_id_idx
  on public.document_corrections (conversation_id);

create trigger update_document_corrections_updated_at
before update on public.document_corrections
for each row
execute function public.update_updated_at_column();