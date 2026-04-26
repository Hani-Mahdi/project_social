alter table public.videos add column if not exists transcript_snippet text;

create table public.optimization_cache (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  input_hash text not null,
  result jsonb not null,
  ai_model text not null,
  created_at timestamptz default now(),
  unique(video_id, input_hash)
);
alter table public.optimization_cache enable row level security;
create policy "users read own cache" on public.optimization_cache
  for select using (
    exists (select 1 from public.videos v where v.id = video_id and v.user_id = auth.uid())
  );

create table public.post_optimizations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null,
  title text,
  caption text,
  hashtags text[],
  hook text,
  ai_model text,
  prompt_version int default 1,
  created_at timestamptz default now()
);
alter table public.post_optimizations enable row level security;
create policy "users read own optimizations" on public.post_optimizations
  for select using (
    exists (
      select 1
      from public.posts p
      join public.videos v on v.id = p.video_id
      where p.id = post_id and v.user_id = auth.uid()
    )
  );

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "users read own usage" on public.ai_usage
  for select using (user_id = auth.uid());

create table public.trending_hashtags (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  platform text not null,
  hashtag text not null,
  rank int not null,
  source text,
  fetched_at timestamptz default now()
);
create index on public.trending_hashtags(niche, platform, rank);
alter table public.trending_hashtags enable row level security;
create policy "everyone reads trending" on public.trending_hashtags for select using (true);
