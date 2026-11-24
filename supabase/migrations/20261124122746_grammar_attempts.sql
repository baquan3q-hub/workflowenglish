-- Append-only learning evidence. A pending AI grade has its own revision.
create table public.grammar_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  revision smallint not null check (revision in (0,1)),
  skill_id text not null,
  occurred_at timestamptz not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  primary key (user_id, event_id, revision)
);
create index grammar_attempts_history on public.grammar_attempts(user_id, occurred_at, event_id);
alter table public.grammar_attempts enable row level security;
revoke all on public.grammar_attempts from anon, authenticated;
grant select, insert on public.grammar_attempts to authenticated;
create policy grammar_read_own on public.grammar_attempts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy grammar_insert_own on public.grammar_attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);
