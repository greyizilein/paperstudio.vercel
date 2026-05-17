-- Tool Processing Pipeline: document corrections table
create table public.document_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references public.czar_conversations(id) on delete set null,
  original_storage_path text not null,
  original_filename text not null,
  original_format text not null default 'docx',
  parsed_text text,
  annotations jsonb default '{"tracked_insertions":[],"tracked_deletions":[],"comments":[]}',
  corrected_html text,
  correction_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.document_corrections enable row level security;

create policy "Users manage own corrections"
  on public.document_corrections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index document_corrections_user_id_idx on public.document_corrections (user_id);
create index document_corrections_conversation_id_idx on public.document_corrections (conversation_id);
