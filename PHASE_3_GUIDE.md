# Growth Copilot — Phase 3 Hand-off Guide (Junior Engineer)

> Implementation plan for the YouTube trending-hashtags refresh. ~3-4 hours of work. Each task has **Goal / Steps / Acceptance / Common pitfalls**. Do not skip the acceptance check.

---

## Context

Phases 0, 1, and 2 are live in production:
- AI optimize feature works (`optimize-post` edge function, ACTIVE)
- Performance widget + "Optimize my last post" card on Dashboard (ACTIVE)
- YouTube view-count metrics auto-pulled every 6h via `pull-youtube-metrics` cron

**The gap now:** The `optimize-post` function already reads from a `trending_hashtags` table to inject "today's trending hashtags" into prompts — but **the table is empty** because nothing populates it. Right now the AI generates hashtags purely from its training-data baseline, which gets stale.

**Phase 3 fixes this for YouTube:** a daily cron that fetches YouTube's `mostPopular` chart, extracts hashtags from titles + descriptions, ranks by frequency, and writes them to `trending_hashtags`. The optimize-post function picks them up automatically — **no changes to existing code**.

**Why YouTube-only first:**
- Free official API (10k units/day quota, this uses ~1 unit/day)
- No OAuth needed — just an API key
- The optimize-post function's current `WHERE platform = 'youtube'` filter Just Works
- TikTok / Instagram trending APIs are scrape-only or paid → defer until we have signal users care

**Cost:** $0/mo. Free YouTube Data API quota is 10k units/day; this uses 1 unit per run, max 30/month.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│ pg_cron: every day at 03:00 UTC                       │
│   → invokes refresh-trending-youtube edge function    │
└────────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ Edge function: refresh-trending-youtube                │
│                                                         │
│ 1. GET youtube/v3/videos                                │
│    ?chart=mostPopular&regionCode=US&maxResults=50      │
│    &part=snippet&key=<YOUTUBE_DATA_API_KEY>            │
│                                                         │
│ 2. For each video, regex extract hashtags from         │
│    title + description (`#[a-zA-Z0-9_]+`)              │
│                                                         │
│ 3. Count frequency across all 50 videos                │
│                                                         │
│ 4. Rank top 50 hashtags                                 │
│                                                         │
│ 5. DELETE existing trending_hashtags WHERE             │
│    platform='youtube' (clear old day's snapshot)       │
│                                                         │
│ 6. INSERT new ranked rows with niche='general'         │
└────────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│ trending_hashtags table (already exists from Phase 1)  │
│   read by existing optimize-post function              │
│   → injected into AI prompts automatically             │
└────────────────────────────────────────────────────────┘
```

**No code changes required to:**
- `supabase/functions/optimize-post/index.ts` — already reads `trending_hashtags` filtered by platform
- `supabase/functions/_shared/ai.ts` — already accepts trending hashtags as input
- Frontend — invisible improvement; users just see better hashtag suggestions

---

## Tasks

### Task 3.1 — Get a YouTube Data API key (~10 min)

**Goal:** Create a Google Cloud API key for unauthenticated YouTube Data API calls. This is **different** from the OAuth client credentials we already have (`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`). Those are for users authorizing their own YouTube account; this key is for app-level public reads like the trending chart.

**Steps:**
1. Open `https://console.cloud.google.com/apis/credentials` (sign in with the same Google account that owns your existing YouTube OAuth client).
2. Top of the page → **+ CREATE CREDENTIALS** → **API key**.
3. A modal pops up with the key — **copy it immediately**, it's only shown once. Format: `AIzaSy...`
4. Click **EDIT API KEY** on the new key:
   - **Name:** `Growth Copilot — YouTube Data API`
   - **API restrictions:** Select **"Restrict key"** → check **YouTube Data API v3** only. **Do not** leave it unrestricted — a leaked unrestricted key gives access to every Google API on the project.
   - Save.
5. Confirm YouTube Data API v3 is enabled on the project: `https://console.cloud.google.com/apis/library/youtube.googleapis.com` → click **Enable** if it isn't already.
6. Set as a Supabase secret:
   ```bash
   cd "/Users/akilkanwar/Desktop/projects/project social"
   supabase secrets set YOUTUBE_DATA_API_KEY="<paste-key>"
   ```
7. Verify it's there:
   ```bash
   supabase secrets list | grep YOUTUBE_DATA_API_KEY
   ```

**Acceptance:**
- `supabase secrets list` shows `YOUTUBE_DATA_API_KEY` with a digest.
- The key in Google Cloud Console shows API restriction: **YouTube Data API v3** only.
- Quick smoke test from your terminal (replace `<KEY>`):
  ```bash
  curl "https://www.googleapis.com/youtube/v3/videos?chart=mostPopular&regionCode=US&maxResults=1&part=snippet&key=<KEY>"
  ```
  Expect a 200 response with a JSON object containing an `items` array.

**Common pitfalls:**
- **Don't reuse `YOUTUBE_CLIENT_SECRET` here.** Different concept entirely. OAuth client secret is for token exchange; this is a simple API key for unauthenticated reads.
- **Do not commit the key anywhere.** Even with API restriction it's still abuse-able for the daily quota.
- Google Cloud sometimes shows "Application restrictions: None" — that's fine for now (we're calling from a Supabase edge function with no fixed IP). Just make sure **API restrictions** is locked to YouTube Data API v3.

---

### Task 3.2 — Build the `refresh-trending-youtube` edge function (~2 hrs)

**Goal:** Daily-runnable function that fetches YouTube's most popular videos, extracts hashtags, ranks them, and replaces the previous day's snapshot in `trending_hashtags`.

**File to create:** `supabase/functions/refresh-trending-youtube/index.ts`

**Skeleton:**

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface YouTubeSnippetItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
  };
}

const HASHTAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_]{1,49})/g;
const TOP_N = 50;
const REGION = "US";

serve(async (req) => {
  // Service-role auth (same pattern as pull-youtube-metrics)
  const auth = req.headers.get("Authorization") ?? "";
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth.includes(expectedKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "YOUTUBE_DATA_API_KEY not set" }), { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Fetch trending videos
    const url = `https://www.googleapis.com/youtube/v3/videos?chart=mostPopular&regionCode=${REGION}&maxResults=50&part=snippet&key=${apiKey}`;
    const ytRes = await fetch(url);
    if (!ytRes.ok) {
      const text = await ytRes.text();
      return new Response(
        JSON.stringify({ error: `YouTube API error: ${ytRes.status}`, detail: text }),
        { status: 502 },
      );
    }
    const ytData = await ytRes.json();
    const items: YouTubeSnippetItem[] = ytData.items ?? [];

    // 2. Extract + count hashtags across all items
    const counts = new Map<string, number>();
    for (const item of items) {
      const haystack = `${item.snippet?.title ?? ""} ${item.snippet?.description ?? ""}`;
      const matches = haystack.matchAll(HASHTAG_REGEX);
      for (const m of matches) {
        const tag = m[1].toLowerCase();
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    // 3. Rank top N
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([hashtag], i) => ({
        niche: "general",
        platform: "youtube",
        hashtag,
        rank: i + 1,
        source: "youtube_data_api_most_popular",
      }));

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, note: "No hashtags found in today's trending videos" }),
        { status: 200 },
      );
    }

    // 4. Replace previous YouTube snapshot atomically-ish
    const { error: deleteError } = await supabase
      .from("trending_hashtags")
      .delete()
      .eq("platform", "youtube");
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from("trending_hashtags")
      .insert(ranked);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ inserted: ranked.length, top: ranked.slice(0, 5) }),
      { status: 200 },
    );
  } catch (e) {
    console.error("refresh-trending-youtube failed:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500 },
    );
  }
});
```

**Steps:**
1. Create the file with the skeleton above. Read it carefully — don't paste blindly.
2. Deploy:
   ```bash
   supabase functions deploy refresh-trending-youtube
   ```
   *(no `--no-verify-jwt` here — we're enforcing service-role auth ourselves, same as `pull-youtube-metrics`)*
3. Smoke test by manually invoking. Get the service role key from Dashboard → API settings → `service_role`:
   ```bash
   curl -X POST "https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/refresh-trending-youtube" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
   ```
4. Expect a JSON response like:
   ```json
   {"inserted": 47, "top": [{"hashtag":"shorts","rank":1,...}, ...]}
   ```
5. Verify in Supabase Studio → SQL editor:
   ```sql
   select hashtag, rank from trending_hashtags
   where platform = 'youtube'
   order by rank limit 10;
   ```
   You should see 10 rows ranked 1-10.

**Acceptance:**
- Manual curl returns 200 with `inserted` count > 0 (typically 30-50).
- `select count(*) from trending_hashtags where platform = 'youtube'` returns the same count.
- `supabase functions logs refresh-trending-youtube` shows no errors.
- The top 5 hashtags in the response match what you'd intuitively expect for current trending YouTube content (e.g. `shorts`, `viral`, etc. — varies by day).

**Common pitfalls:**
- **The HASHTAG_REGEX is intentionally strict.** It requires the first char after `#` to be a letter, length 2-50, alphanumeric + underscore. This filters out `#1`, `#2024`, weird unicode, etc. Don't loosen it without thinking — bad hashtags pollute the prompt context.
- **Lowercase the hashtag** before storing. Otherwise `#Viral` and `#viral` count as separate trends. The skeleton does this — keep it.
- **Don't UPSERT — DELETE then INSERT.** A user's trending list yesterday is irrelevant noise today. Replacing the snapshot keeps the table small (<50 rows) and the query fast.
- **Region matters.** `regionCode=US` is hardcoded for now. Don't over-engineer per-user regions until you have non-US users — that's a Phase 4+ problem.
- **Quota awareness.** This call costs **1 unit** of YouTube Data API quota. Daily quota is 10k. Even running every minute by mistake (don't!) wouldn't hit the limit. Still, scheduling 1×/day is correct because trending data doesn't change meaningfully faster than that.

---

### Task 3.3 — Schedule the daily cron (~20 min)

**Goal:** Have Supabase invoke `refresh-trending-youtube` automatically once per day.

**Path:** Supabase Dashboard SQL Editor (uses `pg_cron` + `pg_net`, already enabled from Phase 2).

**Steps:**
1. Open Supabase Dashboard → your project → **SQL Editor** → New query.
2. Schedule the job. Replace `<SERVICE_ROLE_KEY>` with the actual key from Dashboard → API settings → `service_role`:
   ```sql
   select cron.schedule(
     'refresh-trending-youtube-daily',
     '0 3 * * *',
     $$
     select net.http_post(
       url := 'https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/refresh-trending-youtube',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
         'Content-Type', 'application/json'
       )
     ) as request_id;
     $$
   );
   ```
3. Verify the schedule:
   ```sql
   select jobname, schedule from cron.job;
   ```
   You should see two jobs now:
   - `pull-youtube-metrics-6h` from Phase 2
   - `refresh-trending-youtube-daily` from Phase 3
4. Inspect runs after they happen:
   ```sql
   select jobname, status, return_message, start_time
   from cron.job_run_details
   order by start_time desc limit 10;
   ```

**Acceptance:**
- `cron.job` lists `refresh-trending-youtube-daily` with schedule `0 3 * * *`.
- After the next 03:00 UTC boundary (or after manually triggering via curl from Task 3.2), `cron.job_run_details` shows a `succeeded` row for it.

**Common pitfalls:**
- **Cron expression:** `0 3 * * *` = every day at 03:00 UTC. Stagger from Phase 2's `0 */6 * * *` so they don't fight each other (they wouldn't, but it's good hygiene).
- **Don't run it more than daily.** YouTube trending changes slowly — running hourly burns quota and gives no extra value. The `optimize-post` reads from this table on every call, so daily-fresh data is plenty.
- **To delete the schedule later:** `select cron.unschedule('refresh-trending-youtube-daily');`

---

### Task 3.4 — Verify trending hashtags flow into AI outputs (~15 min)

**Goal:** Confirm the existing optimize-post function picks up the new trending data and includes it in prompts. **No code changes required** — we're just verifying the integration.

**Steps:**
1. Make sure Task 3.2 actually populated `trending_hashtags` (manual curl already done).
2. Open the app:
   ```bash
   npm run dev
   ```
3. Sign in, navigate to PostBuilder, pick a video, write a one-liner, click **"Optimize for all platforms"**.
4. While the request is in flight, in a separate terminal tail the logs:
   ```bash
   supabase functions logs optimize-post --tail
   ```
5. After the response comes back, check:
   - The YouTube card's hashtags should include some trending tags from the table (e.g. `#shorts`, `#viral`, etc. — whatever ranked high today).
   - **Compare against a video optimized before Phase 3:** look in the `optimization_cache` table, find an old result, and notice the YouTube hashtags felt more generic. Today's should feel more current.
6. Force a fresh call (the cache will return last result if inputs are identical):
   - Edit the one-liner slightly so the cache misses.
   - Click Optimize again.
   - The YouTube card should now reflect Phase 3's trending injection.

**Acceptance:**
- Hashtags returned for the YouTube platform overlap meaningfully with the top-10 entries in `trending_hashtags WHERE platform='youtube'`.
- `optimize-post` logs (Task 3.4 step 4) don't show errors related to the trending lookup.
- Subsequent optimizations of new videos automatically include trending tags.

**Common pitfalls:**
- **Cache hit hides Phase 3.** If you re-optimize the same video with identical inputs, you'll get the cached pre-Phase-3 result. Either change the one-liner, use a different video, or temporarily clear that row from `optimization_cache`.
- **Sample size.** With 30-50 trending hashtags, your video's specific topic might overlap with only 0-3 of them. That's normal — the AI is told to consider trending tags as *one* signal, not the only one.
- **Don't expect every hashtag in the output to be trending.** The model picks tags that fit the video's topic; trending injection biases it, doesn't dictate it.

---

## Files most likely to change

**New:**
- `supabase/functions/refresh-trending-youtube/index.ts`

**Modified:** *None.* The optimize-post function and frontend already integrate with `trending_hashtags`.

**Existing files to LEAN ON, do not modify:**
- `supabase/functions/optimize-post/index.ts` — already reads from `trending_hashtags`
- `supabase/functions/pull-youtube-metrics/index.ts` — same auth pattern; copy it, do not import (Deno isolates per-function)
- The `trending_hashtags` table — created in Phase 1's migration

---

## End-to-end verification

After all 4 tasks land:

1. Run the SQL in Supabase Studio:
   ```sql
   select platform, count(*), max(fetched_at) as latest
   from trending_hashtags
   group by platform;
   ```
   Expect one row: `youtube | 30-50 | <today's date>`.

2. Trigger the cron manually one more time to confirm the schedule works:
   ```bash
   curl -X POST "https://wkokdmfjuctvlhefxhrk.supabase.co/functions/v1/refresh-trending-youtube" \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
   ```
   Expect the same `{inserted: N}` shape.

3. Confirm next-day refresh by checking after 03:00 UTC:
   ```sql
   select jobname, status, return_message, start_time
   from cron.job_run_details
   where jobname = 'refresh-trending-youtube-daily'
   order by start_time desc limit 5;
   ```

4. Run the user-facing test from Task 3.4: optimize a new video, see trending tags appear in the YouTube card.

---

## Rough timeline

| Task | Estimate |
|---|---|
| 3.1 API key creation + secrets | 10 min |
| 3.2 edge function + smoke test | 2 hrs |
| 3.3 cron schedule | 20 min |
| 3.4 integration verification | 15 min |
| Buffer | 30 min |
| **Total** | **~3 hrs** |

If it's taking >5 hrs, raise it — the YouTube API + cron pattern is identical to Phase 2 so anything stuck is probably a small config issue that a quick code-review can unblock.

---

## Future expansion (NOT this phase)

When you're ready to add other platforms:
- **TikTok:** RapidAPI free-tier hashtag endpoint or Apify's TikTok actor (paid). Same edge function pattern, different data source. Insert with `platform='tiktok'`.
- **Instagram:** Apify or scrapeless.com (paid). Same pattern.
- **Twitter/X:** Their `/2/trends/by/woeid/1` endpoint (free tier requires Basic plan now $200/mo) or scrape Trending24. Same pattern.
- **Niche refinement:** when users have a `profiles.niche` field, fetch `mostPopular&videoCategoryId=<mapped from niche>` per niche instead of a single global call. Will increase quota use ~5×, still well under limit.

Each platform = its own edge function, its own daily cron, same `trending_hashtags` schema. The optimize-post function already filters by platform — no changes there.

**Don't bundle these into Phase 3.** Ship YouTube alone, see if it actually improves caption quality / user retention, then expand.

---

## House rules

- **Branch:** `phase-3-trending-youtube`. Single PR.
- **One concern per PR.** No drive-by cleanups.
- **Don't touch the optimize-post function.** It already integrates correctly. Mutations introduce regression risk.
- **Service role key never goes to the client.** Used only inside the new edge function and the `cron.schedule` SQL.
- **API key never goes to the client.** Stays in Supabase secrets, used inside the edge function.
- **If unsure → ask.** Two hours stuck is a Slack message; two days stuck is a problem.
