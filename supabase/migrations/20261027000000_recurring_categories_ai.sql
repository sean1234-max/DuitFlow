-- DuitFlow: custom categories, recurring transactions, live updates, AI usage limits.
-- Run once in the Supabase SQL editor after 20261026000000_init.sql.

-- Custom categories: category is now any short name, not just the 8 built-ins.
alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions
  add constraint transactions_category_check check (char_length(category) between 1 and 30);
alter table public.budgets drop constraint if exists budgets_category_check;
alter table public.budgets
  add constraint budgets_category_check check (char_length(category) between 1 and 30);

create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 30),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create unique index categories_user_name_unique on public.categories (user_id, lower(name));

create table public.recurring (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense', 'transfer', 'refund', 'card_payment')),
  amount_sen bigint not null check (amount_sen > 0 and amount_sen <= 10000000000),
  category text check (char_length(category) between 1 and 30),
  note text not null default '' check (char_length(note) <= 100),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_date timestamptz not null,
  last_generated_month text check (last_generated_month ~ '^\d{4}-\d{2}$'),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.categories enable row level security;
alter table public.recurring enable row level security;

create policy "Users manage their own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own recurring rules" on public.recurring
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Live updates between phones (Supabase Realtime respects row-level security).
alter publication supabase_realtime
  add table public.transactions, public.budgets, public.goals, public.recurring, public.categories;

-- AI assistant: questions per user per day. Only the Edge Function (service role)
-- writes here, so users cannot reset their own limit; they may read their count.
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  questions integer not null default 0 check (questions >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "Users read their own AI usage" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Atomic "use one question" for the Edge Function; returns the new count for today.
create function public.use_ai_question(p_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage (user_id, day, questions)
  values (p_user_id, (now() at time zone 'Asia/Kuala_Lumpur')::date, 1)
  on conflict (user_id, day) do update set questions = public.ai_usage.questions + 1
  returning questions;
$$;
revoke execute on function public.use_ai_question(uuid) from public, anon, authenticated;
