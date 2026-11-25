-- Persisted AI-generated grammar drills per learner for cross-device review and personalisation.
create table if not exists public.grammar_ai_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  lesson_id text not null,
  kind text not null check (kind in ('fill', 'fix', 'translate', 'write')),
  level smallint not null check (level between 1 and 5),
  focus_tag text,
  theme text not null default '',
  item jsonb not null check (jsonb_typeof(item) = 'object'),
  source_mode text not null default 'learn' check (source_mode in ('learn', 'errors', 'review')),
  times_seen integer not null default 0,
  times_correct integer not null default 0,
  last_result text check (last_result in ('correct', 'incorrect', 'pending')),
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists grammar_ai_items_user_lesson
  on public.grammar_ai_items(user_id, lesson_id, created_at desc);

alter table public.grammar_ai_items enable row level security;

revoke all on public.grammar_ai_items from anon, authenticated;
grant select, insert, update on public.grammar_ai_items to authenticated;

drop policy if exists grammar_ai_items_read_own on public.grammar_ai_items;
create policy grammar_ai_items_read_own on public.grammar_ai_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists grammar_ai_items_insert_own on public.grammar_ai_items;
create policy grammar_ai_items_insert_own on public.grammar_ai_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists grammar_ai_items_update_own on public.grammar_ai_items;
create policy grammar_ai_items_update_own on public.grammar_ai_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
