alter publication supabase_realtime add table public.document_corrections;
alter table public.document_corrections replica identity full;