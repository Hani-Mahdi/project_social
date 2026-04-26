create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  views bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  fetched_at timestamptz default now(),
  unique(post_id, fetched_at)
);
create index post_metrics_post_id_idx on public.post_metrics(post_id);

alter table public.post_metrics enable row level security;
create policy "users read own metrics" on public.post_metrics
  for select using (
    exists (
      select 1 from public.posts p
      join public.videos v on v.id = p.video_id
      where p.id = post_id and v.user_id = auth.uid()
    )
  );
