-- DuitFlow initial schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Every row belongs to one user; row-level security makes other users' rows invisible.
-- Amounts are integer sen (RM 1 = 100 sen), matching the app.

create table public.transactions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense', 'transfer', 'refund', 'card_payment')),
  amount_sen bigint not null check (amount_sen > 0 and amount_sen <= 10000000000),
  category text check (
    category in ('Food & Drinks', 'Transport', 'Shopping', 'Bills & Utilities',
                 'Entertainment', 'Health', 'Education', 'Other')
  ),
  note text not null default '' check (char_length(note) <= 100),
  occurred_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (
    category in ('Food & Drinks', 'Transport', 'Shopping', 'Bills & Utilities',
                 'Entertainment', 'Health', 'Education', 'Other')
  ),
  limit_sen bigint not null check (limit_sen > 0 and limit_sen <= 10000000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

create table public.goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 40),
  target_sen bigint not null check (target_sen > 0 and target_sen <= 10000000000),
  saved_sen bigint not null default 0 check (saved_sen >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;

-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "Users manage their own transactions" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own budgets" on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own goals" on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
