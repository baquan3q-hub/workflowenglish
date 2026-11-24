create table public.lll_library (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null check (url like 'https://%' and length(url) <= 2048),
  title text not null check (length(btrim(title)) between 1 and 160),
  topic text not null check (topic in ('tech', 'skills', 'life')),
  language text not null check (language in ('vi', 'en')),
  minutes integer check (minutes between 1 and 600),
  saved boolean not null default false,
  finished boolean not null default false,
  note text not null default '' check (length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, url)
);

alter table public.lll_library enable row level security;
grant select, insert, update on public.lll_library to authenticated;
create policy "Read own LLL library" on public.lll_library for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Add to own LLL library" on public.lll_library for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own LLL library" on public.lll_library for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
