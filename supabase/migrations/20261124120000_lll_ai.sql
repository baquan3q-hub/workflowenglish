-- Lifelong Learning with AI (English reading companion).
--
--   1. lll_library accepts the 7 topics and keeps a link's level, kind,
--      publisher and origin (catalog, ai or user).
--   2. Storage bucket lll-companion: public read, written only by the ai-proxy
--      Edge Function (op lllCompanion) with the service role.
--
-- Safe to re-run. Before it is applied the app still saves links, with the
-- old columns and new topics mapped onto tech / skills / life.

alter table public.lll_library drop constraint if exists lll_library_topic_check;
alter table public.lll_library add constraint lll_library_topic_check
  check (topic in ('tech', 'skills', 'life', 'society', 'work', 'planet', 'health'));

alter table public.lll_library
  add column if not exists level text check (level in ('A2', 'B1', 'B2', 'C1')),
  add column if not exists kind text check (kind in ('article', 'perspective', 'explainer', 'video')),
  add column if not exists publisher text check (length(publisher) <= 80),
  add column if not exists origin text not null default 'user' check (origin in ('catalog', 'ai', 'user'));

-- Public buckets are readable by URL without a select policy; only the
-- service role (which bypasses RLS) can write.
insert into storage.buckets (id, name, public)
values ('lll-companion', 'lll-companion', true)
on conflict (id) do update set public = true;
