# Growth Copilot — Phase 2 Hand-off Guide (Junior Engineer)

> Detailed implementation plan for the next two-day chunk. Hand this directly to the engineer. Each task has **Goal / Steps / Acceptance / Common pitfalls**. Do not skip the acceptance check.

---

## Context

Phase 0 (foundation fixes) and Phase 1 (the AI optimize feature) are **already shipped and live in production**:
- `optimize-post` edge function deployed and ACTIVE on the remote project
- 4 new tables on remote DB: `optimization_cache`, `post_optimizations`, `ai_usage`, `trending_hashtags`
- Frontend "Optimize for all platforms" button in `src/pages/PostBuilder.tsx`
- Gemini API as the dev LLM provider

**The product gap now:** Phase 1 makes users *try* the app. Nothing makes them *come back*. A user who runs Optimize once has no reason to return tomorrow because they get no signal that the AI suggestions actually worked.

**This phase fixes that with two complementary retention hooks:**

1. **Performance Feedback Loop** — pull real YouTube view/like counts for posted videos and show users a Dashboard widget like *"Your AI-optimized posts got 2.3× the views of your unoptimized ones."* The number is the dopamine hit that drives return visits.
2. **"Optimize My Last Post" Dashboard card** — a one-click pinned card that runs the existing optimize-post flow on the user's most recent un-optimized video. Lowest-friction repeat-engagement path.

**Why this scope and not the alternatives:**
- *Trending hashtags refresh*: cheaper, but improves output quality marginally — doesn't solve the retention gap.
- *Real TikTok/IG/X posting*: huge scope, no retention payoff until users actually want it.
- *Performance loop*: directly addresses the stated retention goal, ~2 days, uses scopes we already have.

**Cost:** $0/mo. YouTube Data API free quota (10k units/day) covers ~1000 metric fetches per day — plenty for early users. No Anthropic spend for this phase.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Cron edge function: pull-youtube-metrics         │
│  Runs every 6h via Supabase pg_cron               │
│                                                   │
│  for each user with YouTube connected:            │
│    refresh access_token via refresh_token         │
│    for each post with platform='youtube'          │
│        and platform_post_id IS NOT NULL:          │
│      GET youtube.googleapis.com/v3/videos         │
│        ?id=<platform_post_id>&part=statistics     │
│      upsert into post_metrics                     │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  Dashboard.tsx: PerformanceWidget                │
│  Query joins post_metrics + post_optimizations   │
│  → "Optimized posts: 12k avg views"              │
│  → "Unoptimized posts: 5.2k avg views"           │
│  → "AI-optimized posts get 2.3× more views"      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Dashboard.tsx: OptimizeLastPostCard             │
│  Most recent video with no row in                │
│  post_optimizations → big button → calls existing │
│  optimize-post function                           │
└──────────────────────────────────────────────────┘
```

**Key reuse — do not rebuild any of this:**
- `supabase/functions/_shared/ai.ts` — already exists, do not touch
- `supabase/functions/optimize-post/index.ts` — already exists, do not touch (the card just *calls* it)
- `src/lib/ai/client.ts` — already exists with `optimizePost()`, the card calls this directly
- `src/components/optimization/OptimizationPanel.tsx` — already exists; the card can render this same component when results come back
- YouTube refresh-token flow — already implemented in `supabase/functions/upload-to-youtube/index.ts` (lines 111-127); copy the pattern, don't reinvent it
- shadcn `<Card>`, `<Button>`, `<Skeleton>` — use these, don't write new visual primitives

---

## Tasks

### Task 2.1 — Add the `post_metrics` table (~15 min)

**Goal:** New table to store YouTube view/like counts per post over time.

**File to create:** `supabase/migrations/<new-timestamp>_post_metrics.sql`

**Steps:**
1. Run `supabase migration new post_metrics` to generate the file with a fresh timestamp.
2. Paste this SQL:
   ```sql
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
   -- inserts only happen from the cron edge function via service role, which bypasses RLS
   ```
3. Push:
   ```bash
   SUPABASE_DB_PASSWORD="<your-password>" supabase db push
   ```

**Acceptance:** Table visible in Supabase Studio. Selecting from it as a normal user returns 0 rows without erroring (RLS allows the read but no rows exist yet).

**Common pitfalls:**
- Don't use `ON CONFLICT (post_id) DO UPDATE`. We want *time-series* data — multiple rows per post over time so we can graph trends later. The unique constraint is `(post_id, fetched_at)`.
- Don't add an INSERT policy for normal users — only the service role writes here.

---

### Task 2.2 — Build the `pull-youtube-metrics` edge function (~3 hrs)

**Goal:** A function that, when invoked, walks every YouTube-connected user, refreshes their token, fetches stats for each posted video, and upserts into `post_metrics`. We'll wire up the cron schedule in Task 2.3.

**File to create:** `supabase/functions/pull-youtube-metrics/index.ts`

**Skeleton:** (mirror the structure of `supabase/functions/upload-to-youtube/index.ts` — same auth pattern, same token-refresh pattern; do not reinvent it)

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // No CORS needed — this is invoked by cron, not by browsers.
  // Auth check: only allow service role
  const auth = req.headers.get("Authorization") ?? "";
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth.includes(expectedKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Get all users with a YouTube connection
  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("user_id, refresh_token")
    .eq("platform", "youtube");

  let processed = 0;
  let errors = 0;

  for (const account of accounts ?? []) {
    try {
      // 2. Refresh access token (copy pattern from upload-to-youtube/index.ts:111-127)
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("YOUTUBE_CLIENT_ID")!,
          client_secret: Deno.env.get("YOUTUBE_CLIENT_SECRET")!,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        errors++;
        continue;
      }

      // 3. Get all posted YouTube posts for this user
      const { data: posts } = await supabase
        .from("posts")
        .select("id, platform_post_id, video:videos!inner(user_id)")
        .eq("platform", "youtube")
        .eq("status", "posted")
        .not("platform_post_id", "is", null)
        .eq("video.user_id", account.user_id);

      if (!posts?.length) continue;

      // 4. Batch the YouTube IDs (YouTube allows up to 50 IDs per call)
      const ids = posts.map(p => p.platform_post_id).join(",");
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${ids}&part=statistics`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      const ytData = await ytRes.json();

      // 5. For each YouTube item, find the matching post and upsert metrics
      for (const item of ytData.items ?? []) {
        const post = posts.find(p => p.platform_post_id === item.id);
        if (!post) continue;
        const stats = item.statistics ?? {};
        await supabase.from("post_metrics").insert({
          post_id: post.id,
          views: parseInt(stats.viewCount ?? "0"),
          likes: parseInt(stats.likeCount ?? "0"),
          comments: parseInt(stats.commentCount ?? "0"),
        });
        processed++;
      }
    } catch (e) {
      console.error(`Failed for user ${account.user_id}:`, e);
      errors++;
    }
  }

  return new Response(JSON.stringify({ processed, errors }), { status: 200 });
});
```

**Steps:**
1. Create the file with the skeleton above. Read it carefully — don't paste blindly.
2. Confirm `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are already set in Supabase secrets (run `supabase secrets list`). If not, set them:
   ```bash
   supabase secrets set YOUTUBE_CLIENT_ID="<from your Google Cloud Console>" YOUTUBE_CLIENT_SECRET="<from console>"
   ```
3. Deploy:
   ```bash
   supabase functions deploy pull-youtube-metrics
   ```
   *(no `--no-verify-jwt` here — we're enforcing service-role auth ourselves)*
4. Smoke test by manually invoking it with the service role key:
   ```bash
   curl -X POST "https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/pull-youtube-metrics" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY from Supabase Dashboard → API settings>"
   ```
   Expect: `{"processed": <some number>, "errors": 0}`.
5. Check `post_metrics` table in Studio — should have rows for any YouTube-posted video.

**Acceptance:**
- Manual curl returns 200 with a `processed` count.
- `select * from post_metrics` shows fresh rows with non-zero `views` for the test account's actual YouTube videos.
- `supabase functions logs pull-youtube-metrics` shows no errors.

**Common pitfalls:**
- **Do not commit the service role key.** It bypasses RLS — exposing it = full database access.
- The Supabase relational filter syntax (`video:videos!inner(user_id)` with `.eq("video.user_id", ...)`) is correct — `!inner` makes it an inner join. Without `!inner`, the eq filter on the related table is silently ignored.
- YouTube batch limit is 50 IDs per `videos.list` call. If a user has >50 posted videos, chunk the IDs into groups of 50. (Add this only when you actually have a user with 50+ — premature for now.)
- If `tokenData.access_token` is missing, **don't crash the whole run.** Log it and continue to the next user. We deliberately swallow per-user errors so one broken account doesn't block everyone.

---

### Task 2.3 — Schedule the cron (~30 min)

**Goal:** Have Supabase invoke `pull-youtube-metrics` automatically every 6 hours.

**Path:** Run SQL via the Supabase Dashboard SQL Editor (this approach uses `pg_cron` + `pg_net`, both built into Supabase).

**Steps:**
1. Open Supabase Dashboard → your project → **SQL Editor** → New query.
2. Run this once to enable extensions (idempotent — fine to re-run):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   ```
3. Schedule the job. Replace `<SERVICE_ROLE_KEY>` with the actual key from Dashboard → API settings → **service_role** key:
   ```sql
   select cron.schedule(
     'pull-youtube-metrics-6h',
     '0 */6 * * *',
     $$
     select net.http_post(
       url := 'https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/pull-youtube-metrics',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
         'Content-Type', 'application/json'
       )
     ) as request_id;
     $$
   );
   ```
4. Verify the schedule:
   ```sql
   select * from cron.job;
   ```
   You should see one row with `jobname = 'pull-youtube-metrics-6h'` and `schedule = '0 */6 * * *'`.
5. To inspect runs after they happen:
   ```sql
   select * from cron.job_run_details order by start_time desc limit 10;
   ```

**Acceptance:**
- `cron.job` lists the new job.
- After 6+ hours (or after manually triggering it once via curl as in Task 2.2), `post_metrics` has fresh rows with newer `fetched_at` values.

**Common pitfalls:**
- **Service role key in SQL is sensitive.** Anyone with database access can read it. This is the standard Supabase pattern, so accept it — but don't paste this query into Slack/email/screenshots.
- `0 */6 * * *` means at the top of the hour, every 6 hours (00:00, 06:00, 12:00, 18:00 UTC). Don't write `*/6 * * * *` (that's every 6 minutes — would blow your YouTube API quota).
- To delete the schedule later: `select cron.unschedule('pull-youtube-metrics-6h');`

---

### Task 2.4 — Build the `<PerformanceWidget>` on Dashboard (~3 hrs)

**Goal:** A Dashboard card showing the AI-vs-not view ratio. This is the retention dopamine.

**Files:**
- New: `src/components/dashboard/PerformanceWidget.tsx`
- New: `src/lib/database.ts` — add a `getPerformanceComparison(userId)` helper
- Edit: `src/pages/Dashboard.tsx` — render the widget at the top

**Steps:**

**4a. Database helper.** In `src/lib/database.ts`, add:
```ts
export interface PerformanceComparison {
  optimizedAvgViews: number;
  unoptimizedAvgViews: number;
  ratio: number;          // optimized / unoptimized, or 0 if not enough data
  optimizedCount: number;
  unoptimizedCount: number;
}

export async function getPerformanceComparison(): Promise<PerformanceComparison> {
  // For each post, get its latest metric row, and whether an optimization exists
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      post_metrics(views, fetched_at),
      post_optimizations(id)
    `)
    .eq('status', 'posted');
  if (error || !data) {
    return { optimizedAvgViews: 0, unoptimizedAvgViews: 0, ratio: 0, optimizedCount: 0, unoptimizedCount: 0 };
  }

  let optSum = 0, optCount = 0, unoptSum = 0, unoptCount = 0;
  for (const post of data) {
    // Latest metric row
    const metrics = (post.post_metrics ?? []).sort(
      (a: any, b: any) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime()
    );
    const views = metrics[0]?.views ?? 0;
    const isOptimized = (post.post_optimizations ?? []).length > 0;
    if (isOptimized) { optSum += views; optCount++; }
    else { unoptSum += views; unoptCount++; }
  }

  const optimizedAvgViews = optCount > 0 ? Math.round(optSum / optCount) : 0;
  const unoptimizedAvgViews = unoptCount > 0 ? Math.round(unoptSum / unoptCount) : 0;
  const ratio = unoptimizedAvgViews > 0 ? optimizedAvgViews / unoptimizedAvgViews : 0;

  return { optimizedAvgViews, unoptimizedAvgViews, ratio, optimizedCount: optCount, unoptimizedCount: unoptCount };
}
```

**4b. Component.** Create `src/components/dashboard/PerformanceWidget.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPerformanceComparison } from "@/lib/database";

export function PerformanceWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["performance-comparison"],
    queryFn: getPerformanceComparison,
    staleTime: 5 * 60 * 1000, // 5 min — cron refreshes every 6h, so stale-while-revalidate is fine
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;

  // Need a minimum sample to show a credible comparison
  const enoughData = data.optimizedCount >= 1 && data.unoptimizedCount >= 1;
  if (!enoughData) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold">Performance tracking</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Optimize and post {Math.max(0, 1 - data.optimizedCount)} more video{data.optimizedCount === 0 ? 's' : ''} to see how AI optimization is performing for you.
        </p>
      </Card>
    );
  }

  const ratioStr = data.ratio >= 1 ? `${data.ratio.toFixed(1)}× more` : `${(1/data.ratio).toFixed(1)}× fewer`;
  const positive = data.ratio >= 1;

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Your AI-optimized posts get {ratioStr} views</h3>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold">{data.optimizedAvgViews.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Avg views, AI-optimized ({data.optimizedCount})</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{data.unoptimizedAvgViews.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Avg views, no optimization ({data.unoptimizedCount})</div>
        </div>
      </div>
      {!positive && (
        <p className="text-xs text-muted-foreground mt-4">
          Sample is small — keep posting to get a clearer picture.
        </p>
      )}
    </Card>
  );
}
```

**4c. Mount in Dashboard.** In `src/pages/Dashboard.tsx`, import `PerformanceWidget` and render it near the top of the dashboard content (above the video grid). Don't replace anything — this is additive.

**Acceptance:**
- With 0 posted videos: shows "Optimize and post 1 more video..." copy.
- With 1+ optimized + 1+ unoptimized: shows the ratio + two stat numbers.
- Numbers update after `pull-youtube-metrics` runs (manually trigger via curl from Task 2.2 if you don't want to wait 6h).

**Common pitfalls:**
- **Sample-size honesty.** A 10× ratio with one optimized + one unoptimized post is meaningless and misleading. The "small sample" footnote handles low-confidence cases. Keep it.
- The Supabase query uses **two relations** (`post_metrics`, `post_optimizations`) — both auto-join via FK. Test this query in Supabase Studio's SQL editor first if it returns weird shapes.
- TanStack Query's `queryKey` doesn't auto-include the user — that's fine here because the underlying query goes through RLS, which scopes by `auth.uid()`.

---

### Task 2.5 — Build the `<OptimizeLastPostCard>` on Dashboard (~2 hrs)

**Goal:** A pinned card showing the user's most recent video that has no optimization yet, with a single button that runs the existing optimize-post flow.

**Files:**
- New: `src/components/dashboard/OptimizeLastPostCard.tsx`
- Edit: `src/lib/database.ts` — add `getMostRecentUnoptimizedVideo()`
- Edit: `src/pages/Dashboard.tsx` — render the card near the top

**Steps:**

**5a. Database helper.** In `src/lib/database.ts`:
```ts
export async function getMostRecentUnoptimizedVideo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('videos')
    .select(`
      id, title, created_at,
      posts(id, post_optimizations(id))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (!data) return null;

  // Find the first video where none of its posts have an optimization
  return data.find(v => {
    const posts = v.posts ?? [];
    return posts.length === 0 || posts.every(p => (p.post_optimizations ?? []).length === 0);
  }) ?? null;
}
```

**5b. Component.** Create `src/components/dashboard/OptimizeLastPostCard.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { getMostRecentUnoptimizedVideo } from "@/lib/database";

export function OptimizeLastPostCard() {
  const navigate = useNavigate();
  const { data: video, isLoading } = useQuery({
    queryKey: ["most-recent-unoptimized"],
    queryFn: getMostRecentUnoptimizedVideo,
  });

  if (isLoading || !video) return null;

  return (
    <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
            <Sparkles className="h-3 w-3" /> Suggested next step
          </div>
          <h3 className="font-semibold mt-2">Optimize "{video.title || 'your latest video'}"</h3>
          <p className="text-sm text-muted-foreground mt-1">
            One click generates AI titles, captions, and hashtags for every platform.
          </p>
        </div>
        <Button onClick={() => navigate(`/dashboard/post?videoId=${video.id}&autoOptimize=1`)}>
          Optimize now
        </Button>
      </div>
    </Card>
  );
}
```

**5c. PostBuilder auto-trigger.** The card passes `?videoId=X&autoOptimize=1` to PostBuilder. In `src/pages/PostBuilder.tsx`, add a `useEffect` that reads these query params on mount:
- If `videoId` is present, pre-select that video.
- If `autoOptimize=1`, call the existing optimize handler once after the video loads.

Use `useSearchParams` from `react-router-dom`. Important: only call `autoOptimize` once — guard with a `useRef(false)` flag flipped to `true` on first call, otherwise re-renders will re-trigger the optimization.

**5d. Mount in Dashboard.** Place the card directly above `<PerformanceWidget>` in `src/pages/Dashboard.tsx`.

**Acceptance:**
- Card hides if user has no videos or all videos already have optimizations.
- Clicking the button navigates to PostBuilder with the right video selected, and the optimize flow auto-runs once.
- After completion, navigating back to Dashboard re-queries `getMostRecentUnoptimizedVideo()` and either shows the next un-optimized video or hides the card entirely.

**Common pitfalls:**
- **Idempotent auto-trigger.** Without the `useRef` guard, `autoOptimize=1` will re-fire on every PostBuilder re-render — burning quota and possibly racing.
- Don't redirect the user — *navigate* to PostBuilder. Redirect breaks the back button.
- The query for "unoptimized" looks at `post_optimizations`, which is populated by the optimize-post function. If it's not getting written, double-check that function isn't silently failing. (`supabase functions logs optimize-post`).

---

## Files most likely to change

**New:**
- `supabase/migrations/<ts>_post_metrics.sql`
- `supabase/functions/pull-youtube-metrics/index.ts`
- `src/components/dashboard/PerformanceWidget.tsx`
- `src/components/dashboard/OptimizeLastPostCard.tsx`

**Modified:**
- `src/lib/database.ts` — add `getPerformanceComparison`, `getMostRecentUnoptimizedVideo`
- `src/pages/Dashboard.tsx` — mount the two new widgets at the top
- `src/pages/PostBuilder.tsx` — read query params for auto-optimize

**Existing files to LEAN ON, do not modify:**
- `supabase/functions/_shared/ai.ts` — done
- `supabase/functions/optimize-post/index.ts` — done
- `src/lib/ai/client.ts` — done; `OptimizeLastPostCard` triggers PostBuilder which already calls this
- `supabase/functions/upload-to-youtube/index.ts` — copy its token-refresh pattern verbatim, do not import from it (Deno isolates per-function)

---

## End-to-end verification

After all 5 tasks land, run this acceptance flow on production (the dev loop is deploy-and-test-against-remote — see prior phases):

1. Make sure your test account has at least one YouTube-connected user with at least one video posted to YouTube (i.e. has a real `platform_post_id`).
2. Manually trigger the metrics pull:
   ```bash
   curl -X POST "https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/pull-youtube-metrics" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
   ```
   Expect 200 with `{processed: N, errors: 0}` where N matches your posted-YT-video count.
3. Open Supabase Studio → `post_metrics` — confirm rows with realistic view counts.
4. Open the app → Dashboard.
   - **PerformanceWidget**: shows numeric stats for the AI-vs-not comparison (or the "post more videos" placeholder if sample is too small).
   - **OptimizeLastPostCard**: shows your most recent un-optimized video.
5. Click **Optimize now** on the card.
   - Lands on PostBuilder with the right video pre-selected.
   - Optimization runs automatically once (network tab: one POST to `optimize-post`).
   - Cards fill in with AI suggestions.
6. Navigate back to Dashboard.
   - Either shows the next un-optimized video or hides the card.
7. Confirm cron is scheduled: `select * from cron.job;` shows `pull-youtube-metrics-6h`.
8. Wait until the next 6h boundary (or just trust the schedule + the manual test).

---

## Rough timeline

| Task | Estimate |
|---|---|
| 2.1 migration | 15 min |
| 2.2 metrics edge function | 3 hrs |
| 2.3 cron schedule | 30 min |
| 2.4 PerformanceWidget | 3 hrs |
| 2.5 OptimizeLastPostCard | 2 hrs |
| Buffer / debugging | 2 hrs |
| **Total** | **~1.5 days** |

If it's taking >2.5 days, raise it — something is off-pattern and a code-review can probably unblock fast.

---

## House rules

- **Branch:** `phase-2-retention`. PR per phase, not per task.
- **One concern per PR.** No drive-by cleanups.
- **Don't touch Phase 1 code.** It's working; mutations introduce regression risk.
- **Service role key never goes to the client.** Used only inside `pull-youtube-metrics` and the `cron.schedule` SQL.
- **If unsure → ask.** Two hours stuck is a Slack message; two days stuck is a problem.
