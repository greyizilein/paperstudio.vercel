alter table public.document_corrections
  alter column user_id set not null,
  alter column parsed_text set default '',
  alter column annotations set default '{"tracked_insertions":[],"tracked_deletions":[],"comments":[]}'::jsonb,
  alter column corrected_html set default '';

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.document_corrections'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like '%auth.users%'
  loop
    execute format('alter table public.document_corrections drop constraint %I', c.conname);
  end loop;
end $$;

drop trigger if exists update_document_corrections_updated_at on public.document_corrections;
create trigger update_document_corrections_updated_at
before update on public.document_corrections
for each row
execute function public.update_updated_at_column();