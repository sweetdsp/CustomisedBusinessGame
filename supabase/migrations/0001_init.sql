-- Business Game: one public record per game, secrets kept apart, written only by the edge function.
create table if not exists public.games (
  id uuid primary key,
  code text not null unique,
  status text not null default 'lobby',
  row jsonb not null,
  version int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.game_secrets (
  id uuid primary key references public.games(id) on delete cascade,
  secrets jsonb not null
);

alter table public.games enable row level security;
alter table public.game_secrets enable row level security;
-- Browsers may only READ games (live updates). There are no insert/update policies: only the edge function writes.
drop policy if exists "read games" on public.games;
create policy "read games" on public.games for select using (true);
-- game_secrets has no policies at all, so browsers can never read it.

alter publication supabase_realtime add table public.games;

-- Remove finished or abandoned games after 24 hours (section 35). Needs the pg_cron extension (Database > Extensions).
create extension if not exists pg_cron;
select cron.schedule('cleanup-games', '0 * * * *', $$delete from public.games where updated_at < now() - interval '24 hours'$$);
