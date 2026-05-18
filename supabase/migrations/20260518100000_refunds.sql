create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  amount_usd numeric not null,
  reason text not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz default now()
);

alter table refunds enable row level security;

create policy "Admin full access on refunds"
  on refunds
  using (
    (select email from auth.users where id = auth.uid()) = 'grey.izilein@gmail.com'
  );
