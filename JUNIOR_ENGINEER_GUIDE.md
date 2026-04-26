# Growth Copilot — Junior Engineer Implementation Guide

> Hand-off document for the engineer implementing the AI optimization feature. Follow it top to bottom. Each task has a **Goal**, **Steps**, **Acceptance criteria**, and **Common pitfalls**. Don't skip the acceptance check — it's how we know you're done.

---

## Before you start (one-time setup, ~30 min)

1. Clone, install, and verify the app runs locally:
   ```bash
   bun install
   bun run dev
   ```
   You should see the app on `http://localhost:8080` (check `vite.config.ts` for the port). Sign up, upload a video, create a draft. If anything is broken before you start changing things, tell the lead — don't try to fix it alongside your work.

2. Make sure you can run the linter and the build cleanly:
   ```bash
   bun run lint
   bun run build
   ```
   Both should exit 0. If they don't, **stop and ask** before continuing.

3. Install Supabase CLI (we'll need it for edge functions and migrations):
   ```bash
   brew install supabase/tap/supabase
   supabase --version    # confirm it works
   supabase login        # follow the browser prompt
   supabase link --project-ref <ASK LEAD FOR REF>
   ```

4. Branching: create a branch per phase. Phase 0 = `phase-0-stabilize`. Open a PR per phase, don't bundle.

---

# PHASE 0 — Stabilize the foundation

**Goal:** small, safe fixes so the codebase is healthy before we add AI. ~half a day.

---

## Task 0.1 — Fix the CORS hole in `upload-to-youtube`

**Goal:** The `upload-to-youtube` edge function currently accepts requests from any origin (`*`). Its sister function `youtube-oauth-callback` already has the correct pattern. We're copying it.

**File to edit:** `supabase/functions/upload-to-youtube/index.ts`

**Steps:**
1. Open `supabase/functions/youtube-oauth-callback/index.ts`. Look at lines 1–28 — that's the pattern.
2. Open `supabase/functions/upload-to-youtube/index.ts`. Replace the existing CORS block with the same `allowedOrigins` + `getCorsHeaders(origin)` setup. The structure should be:
   ```ts
   const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
     'http://localhost:8080',
     'http://localhost:5173',
     'https://your-production-domain.com',
   ]

   function getCorsHeaders(origin: string | null): Record<string, string> {
     const isAllowed = origin && allowedOrigins.some(allowed =>
       origin === allowed || origin.endsWith(allowed.replace(/^https?:\/\//, ''))
     )
     return {
       'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
       'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
       'Access-Control-Allow-Methods': 'POST, OPTIONS',
     }
   }
   ```
3. Inside the `serve(async (req) => { ... })` body, the first lines should read `const origin = req.headers.get('origin')` and `const corsHeaders = getCorsHeaders(origin)`. Make sure every `return new Response(...)` in the function still includes `headers: corsHeaders` (or merges it).
4. Deploy locally to test:
   ```bash
   supabase functions serve upload-to-youtube
   ```
5. From a separate terminal, send a request with a bad Origin and a good Origin. The bad origin should still 200 (we're not blocking, we're just not echoing it back), but the response's `Access-Control-Allow-Origin` should NOT match the bad origin. The browser is what enforces this.

**Acceptance criteria:**
- File no longer contains the literal string `'*'` for `Access-Control-Allow-Origin`.
- Manual test: from the actual app (`localhost:8080`), the YouTube upload still works.
- Diff is confined to one file.

**Common pitfalls:**
- Forgetting to merge `corsHeaders` into error responses — every `Response` in the file needs them.
- Don't change the business logic of the function. CORS only.

---

## Task 0.2 — Add an Error Boundary

**Goal:** When a query throws on Dashboard / Library / PostBuilder, users currently see a blank screen. Add a fallback.

**Files:**
- New: `src/components/ErrorBoundary.tsx`
- Edit: `src/App.tsx`

**Steps:**
1. Create `src/components/ErrorBoundary.tsx`:
   ```tsx
   import { Component, ReactNode } from "react"
   import { Button } from "@/components/ui/button"

   interface Props { children: ReactNode }
   interface State { error: Error | null }

   export class ErrorBoundary extends Component<Props, State> {
     state: State = { error: null }

     static getDerivedStateFromError(error: Error): State {
       return { error }
     }

     componentDidCatch(error: Error, info: unknown) {
       if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info)
     }

     render() {
       if (this.state.error) {
         return (
           <div className="flex min-h-screen items-center justify-center p-6">
             <div className="max-w-md text-center space-y-4">
               <h1 className="text-2xl font-semibold">Something broke</h1>
               <p className="text-muted-foreground text-sm">{this.state.error.message}</p>
               <Button onClick={() => window.location.reload()}>Reload</Button>
             </div>
           </div>
         )
       }
       return this.props.children
     }
   }
   ```
2. In `src/App.tsx`, import the boundary and wrap the **inside** of your protected routes (after `<ProtectedRoute>` but around the page tree). Don't wrap the whole app — auth needs to work even if the boundary trips.

**Acceptance criteria:**
- Add `throw new Error("test")` at the top of `Dashboard.tsx`'s component body, run the app, navigate to `/dashboard`. You should see the fallback, not a blank page. **Remove the throw before committing.**
- Linter clean.

**Common pitfalls:**
- Wrapping outside `ProtectedRoute` means an auth error sends users to a dead-end with no logout. Wrap inside.

---

## Task 0.3 — Fix the N+1 query on Dashboard

**Goal:** Dashboard currently fetches videos, then loops and fetches posts per video. That's 1 + N requests. Replace with a single joined query.

**Files:**
- Edit: `src/lib/database.ts`
- Edit: `src/pages/Dashboard.tsx`

**Steps:**
1. Find the function in `src/lib/database.ts` that fetches videos (likely `getUserVideos` or similar — search for `from('videos')`).
2. Change the `.select('*')` to `.select('*, posts(*)')`. Supabase will auto-join on the `posts.video_id` foreign key. Confirm the FK exists in `supabase/schema.sql` — it should.
3. Update the TypeScript return type to include the joined `posts` array.
4. In `Dashboard.tsx`, find the place that makes a second query for posts. Delete it. Use `video.posts` directly.
5. Open the browser Network tab. Refresh Dashboard. You should see **one** request for videos, not 1 + N.

**Acceptance criteria:**
- Network tab shows one `videos` request.
- Dashboard renders the same content as before (no missing posts, no missing platforms).
- TypeScript builds clean.

**Common pitfalls:**
- If `posts` come back `null` instead of `[]` for videos with no posts, default with `video.posts ?? []`.
- Don't change the RLS policies. The join respects existing RLS automatically.

---

## Task 0.4 — Toasts and disabled states on delete

**Goal:** Right now, deleting a video gives no feedback, and double-clicking the delete button can fire two requests.

**Files to edit:** `src/pages/Dashboard.tsx`, `src/pages/Library.tsx` (and any component that owns the delete button).

**Steps:**
1. Find every `await deleteVideo(...)` (or `deletePost`) call. Wrap in try/catch:
   ```ts
   try {
     await deleteVideo(id)
     toast.success("Video deleted")
   } catch (e) {
     toast.error("Couldn't delete — try again")
     if (import.meta.env.DEV) console.error(e)
   }
   ```
   `toast` comes from `sonner` — see other toasts in the file for the exact import path used in this codebase.
2. Add a local `useState<boolean>` per delete action: `const [isDeleting, setIsDeleting] = useState(false)`. Set true before the call, false in `finally`. Pass `disabled={isDeleting}` to the button.

**Acceptance criteria:**
- Click delete: toast appears.
- Spam-click delete: only one network request fires (check Network tab).
- Errors show a red toast, not a silent failure.

---

## Task 0.5 — Strip stray `console.log`s

**Goal:** Production console is noisy. There are ~13 `console.log` statements in pages/hooks.

**Steps:**
1. Search the codebase: `rg "console\.log" src/`
2. For each:
   - If it's a debugging breadcrumb that's actually useful, gate it: `if (import.meta.env.DEV) console.log(...)`.
   - If it's leftover from debugging, **delete it**.
3. Leave `console.error` alone — those are fine in production.

**Acceptance criteria:**
- `rg "console\.log\(" src/ | grep -v "import.meta.env.DEV"` returns nothing.

---

## Task 0.6 — Extract platform constants

**Goal:** TikTok / Instagram / YouTube / Twitter metadata (icons, colors, gradients, display names) is duplicated across Dashboard, Library, and PostBuilder. We're consolidating because Phase 1 will use it heavily.

**File to create:** `src/constants/platforms.ts`

**Steps:**
1. Create the file. Define one source of truth:
   ```ts
   import { Youtube } from "lucide-react"
   // ...other icons

   export type PlatformId = "tiktok" | "instagram" | "youtube" | "twitter"

   export interface PlatformConfig {
     id: PlatformId
     name: string         // "TikTok"
     icon: typeof Youtube // lucide icon component
     gradient: string     // tailwind gradient classes
     color: string        // hex for charts
   }

   export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
     tiktok:    { id: "tiktok",    name: "TikTok",    icon: /*...*/, gradient: "...", color: "#000000" },
     instagram: { id: "instagram", name: "Instagram", icon: /*...*/, gradient: "...", color: "#E1306C" },
     youtube:   { id: "youtube",   name: "YouTube",   icon: Youtube, gradient: "...", color: "#FF0000" },
     twitter:   { id: "twitter",   name: "Twitter",   icon: /*...*/, gradient: "...", color: "#000000" },
   }

   export const PLATFORM_LIST = Object.values(PLATFORMS)
   ```
2. Find every inline platform config in Dashboard / Library / PostBuilder. Replace with imports from this file.

**Acceptance criteria:**
- One file is the source of truth.
- Searching `rg "tiktok.*gradient" src/` only matches the new file.
- App still renders identical UI.

---

## Phase 0 wrap-up

```bash
bun run lint
bun run build
```
Both clean. Open a PR titled "Phase 0: stabilize foundation". List the 6 tasks. Get review and merge before starting Phase 1.

---

# PHASE 1 — The "Optimize" feature (the demoable wedge)

**Goal:** User clicks one button → AI generates per-platform titles, captions, hashtags. Free during dev (Gemini), swappable to Claude Haiku in prod. ~3–5 days.

---

## Task 1.1 — Get a free Gemini API key

**Steps:**
1. Visit `https://aistudio.google.com/apikey` (sign in with the team Google account — ask the lead).
2. Create a key. Copy it.
3. Add to local env (Supabase functions read from their own secrets, but for edge function local dev create `supabase/functions/.env`):
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AI...
   ```
4. **Never commit this file.** Confirm it's in `.gitignore` (add `supabase/functions/.env` if not).

---

## Task 1.2 — Database migration

**Goal:** Tables for caching AI results, tracking quota, and storing trending hashtags.

**File to create:** `supabase/migrations/<timestamp>_optimization.sql` (Supabase CLI generates the timestamp via `supabase migration new optimization`).

**SQL:**
```sql
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
    exists (select 1 from public.posts p
            join public.videos v on v.id = p.video_id
            where p.id = post_id and v.user_id = auth.uid())
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
-- public read; only the cron service role writes
alter table public.trending_hashtags enable row level security;
create policy "everyone reads trending" on public.trending_hashtags for select using (true);
```

**Steps:**
1. `supabase migration new optimization`
2. Paste the SQL above into the generated file.
3. Apply locally: `supabase db reset` (this nukes local data — fine for dev). Or `supabase db push` to apply incrementally.
4. Verify in Supabase Studio (`http://localhost:54323`) that the four tables exist.

**Acceptance criteria:** the four tables are visible, RLS is enabled on all four, and `select * from optimization_cache` returns 0 rows without erroring.

---

## Task 1.3 — Build the AI provider abstraction (server-side)

**Goal:** One function `generateOptimization(input)` that works against Gemini in dev and Claude in prod, switched by env var.

**File to create:** `supabase/functions/_shared/ai.ts`

**Skeleton:**
```ts
export interface OptimizationInput {
  videoTitle: string
  oneLiner: string
  transcriptSnippet?: string
  platforms: ("tiktok" | "instagram" | "youtube" | "twitter")[]
  trendingHashtags: Record<string, string[]>  // platform -> hashtags
}

export interface PlatformOutput {
  title: string
  caption: string
  hashtags: string[]
  hook: string
}

export type OptimizationOutput = Record<string, PlatformOutput>

const SYSTEM_PROMPT = `You are an expert social media content optimizer.
Given a video, produce platform-specific titles, captions, hashtags, and opening hooks.

Rules per platform:
- TikTok: caption max 150 chars, 3-5 hashtags, attention-grabbing hook in first line
- Instagram Reels: caption can be longer (up to 2200 chars), 8-15 hashtags, story-driven
- YouTube Shorts: title under 60 chars (SEO-optimized), description with relevant keywords, 3-5 hashtags
- Twitter/X: under 280 chars total INCLUDING hashtags, 1-2 hashtags max

Return STRICT JSON matching the schema. No prose, no markdown.`

export async function generateOptimization(input: OptimizationInput): Promise<OptimizationOutput> {
  const provider = Deno.env.get("AI_PROVIDER") ?? "gemini"
  if (provider === "gemini") return callGemini(input)
  if (provider === "anthropic") return callAnthropic(input)
  throw new Error(`Unknown AI_PROVIDER: ${provider}`)
}

async function callGemini(input: OptimizationInput): Promise<OptimizationOutput> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const userPrompt = buildUserPrompt(input)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          // For full strictness, add a responseSchema here matching OptimizationOutput.
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("Gemini returned no content")
  return JSON.parse(text) as OptimizationOutput
}

async function callAnthropic(input: OptimizationInput): Promise<OptimizationOutput> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")

  const userPrompt = buildUserPrompt(input)
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error("Anthropic returned no content")
  return JSON.parse(text) as OptimizationOutput
}

function buildUserPrompt(input: OptimizationInput): string {
  return JSON.stringify({
    video_title: input.videoTitle,
    one_liner: input.oneLiner,
    transcript_snippet: input.transcriptSnippet ?? "",
    target_platforms: input.platforms,
    trending_hashtags_by_platform: input.trendingHashtags,
    output_format: {
      tiktok:    { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      instagram: { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      youtube:   { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      twitter:   { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
    },
  }, null, 2)
}
```

**Acceptance criteria:** the file compiles. We'll test it end-to-end in 1.4.

**Common pitfalls:**
- Hard-coding the API key. Always read from `Deno.env.get`.
- Forgetting `responseMimeType: "application/json"` for Gemini — without it, you get markdown-wrapped JSON and `JSON.parse` throws.
- Don't call the model 4 times for 4 platforms. **One call.**

---

## Task 1.4 — Build the `optimize-post` edge function

**File to create:** `supabase/functions/optimize-post/index.ts`

**Skeleton:**
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateOptimization, OptimizationInput } from "../_shared/ai.ts"

const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [
  "http://localhost:8080",
  "http://localhost:5173",
]
function corsHeaders(origin: string | null) {
  const ok = origin && allowedOrigins.some(a => origin === a)
  return {
    "Access-Control-Allow-Origin": ok ? origin! : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

const FREE_DAILY_LIMIT = 10

serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response("ok", { headers })

  try {
    const auth = req.headers.get("Authorization")
    if (!auth) return json({ error: "Missing auth" }, 401, headers)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: "Unauthorized" }, 401, headers)

    const body = await req.json()
    const { video_id, one_liner, platforms } = body
    if (!video_id || !platforms?.length) return json({ error: "Missing fields" }, 400, headers)

    // Quota check
    const today = new Date().toISOString().slice(0, 10)
    const { data: usageRow } = await supabase.from("ai_usage")
      .select("count").eq("user_id", user.id).eq("day", today).maybeSingle()
    const count = usageRow?.count ?? 0
    // (Skip quota check entirely for paid users — TODO when plans land.)
    if (count >= FREE_DAILY_LIMIT) {
      return json({ error: "Daily limit reached", limit: FREE_DAILY_LIMIT }, 429, headers)
    }

    // Fetch the video; RLS ensures it belongs to this user
    const { data: video, error: vErr } = await supabase.from("videos")
      .select("id, title, transcript_snippet").eq("id", video_id).single()
    if (vErr || !video) return json({ error: "Video not found" }, 404, headers)

    // Cache lookup
    const inputHash = await sha256(JSON.stringify({ one_liner, platforms, t: video.transcript_snippet }))
    const { data: cached } = await supabase.from("optimization_cache")
      .select("result").eq("video_id", video_id).eq("input_hash", inputHash).maybeSingle()
    if (cached) return json({ result: cached.result, cached: true }, 200, headers)

    // Trending hashtags per platform
    const trending: Record<string, string[]> = {}
    for (const p of platforms) {
      const { data: rows } = await supabase.from("trending_hashtags")
        .select("hashtag").eq("platform", p).order("rank").limit(15)
      trending[p] = rows?.map(r => r.hashtag) ?? []
    }

    const input: OptimizationInput = {
      videoTitle: video.title ?? "",
      oneLiner: one_liner ?? "",
      transcriptSnippet: video.transcript_snippet ?? "",
      platforms,
      trendingHashtags: trending,
    }
    const result = await generateOptimization(input)

    // Persist cache + bump usage
    await supabase.from("optimization_cache").insert({
      video_id, input_hash: inputHash, result, ai_model: Deno.env.get("AI_PROVIDER") ?? "gemini",
    })
    await supabase.from("ai_usage").upsert(
      { user_id: user.id, day: today, count: count + 1 },
      { onConflict: "user_id,day" },
    )

    return json({ result, cached: false, usage: { count: count + 1, limit: FREE_DAILY_LIMIT } }, 200, headers)
  } catch (e) {
    console.error(e)
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500, headers)
  }
})

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  })
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("")
}
```

**Steps:**
1. Create the file.
2. Local serve: `supabase functions serve optimize-post --env-file ./supabase/functions/.env`
3. Test with curl from the project root (replace `<JWT>` with a real session token — get one by logging in to the app and grabbing it from the Network tab on any Supabase request, header `Authorization: Bearer ...`):
   ```bash
   curl -X POST http://localhost:54321/functions/v1/optimize-post \
     -H "Authorization: Bearer <JWT>" \
     -H "Content-Type: application/json" \
     -H "Origin: http://localhost:8080" \
     -d '{"video_id":"<some-video-uuid>","one_liner":"How I learned to cook eggs","platforms":["tiktok","youtube"]}'
   ```
4. You should get JSON back with `tiktok` and `youtube` keys, each with title/caption/hashtags/hook.
5. Run the same curl twice. Second response should have `"cached": true`.

**Acceptance criteria:**
- First call returns valid JSON in <10s.
- Second identical call returns from cache (much faster, `cached: true`).
- 11th call in one day returns 429.
- Curl from a different origin (`Origin: http://evil.example`) does not echo the bad origin in CORS.

**Common pitfalls:**
- Forgetting to pass `Authorization` header to the inner Supabase client — RLS will silently filter everything out.
- Hashing the input differently on cache write vs. read — make sure `inputHash` uses the exact same string.

---

## Task 1.5 — Wire the UI

**Files:**
- Edit: `src/pages/PostBuilder.tsx`
- New: `src/components/optimization/OptimizationPanel.tsx`
- New: `src/lib/ai/client.ts` (thin client wrapper)

**Steps:**
1. `src/lib/ai/client.ts`:
   ```ts
   import { supabase } from "@/lib/supabase"

   export async function optimizePost(input: {
     videoId: string
     oneLiner: string
     platforms: string[]
   }) {
     const { data, error } = await supabase.functions.invoke("optimize-post", {
       body: {
         video_id: input.videoId,
         one_liner: input.oneLiner,
         platforms: input.platforms,
       },
     })
     if (error) throw error
     return data as {
       result: Record<string, { title: string; caption: string; hashtags: string[]; hook: string }>
       cached: boolean
       usage?: { count: number; limit: number }
     }
   }
   ```
2. `src/components/optimization/OptimizationPanel.tsx`: a component that renders one card per platform with the AI suggestions and three buttons (Use, Edit, Regenerate). Use existing shadcn `<Card>` and `<Button>` so it matches the rest of the app. **Do not invent new visual styles — copy the Dashboard card patterns.**
3. In PostBuilder, add an "Optimize for all platforms" primary button. On click:
   - Set a `loading` state.
   - Call `optimizePost(...)`.
   - On success, render `<OptimizationPanel result={...} />` and surface the quota counter.
   - On error, `toast.error(err.message)`.
4. Wire **Use** to populate the existing caption/title fields for that platform. Wire **Regenerate** to call again with a slightly modified input (e.g. append a nonce to the `one_liner`) so the cache misses intentionally.

**Acceptance criteria:**
- Manual: upload a video, open PostBuilder, click Optimize, see cards fill in within 10 seconds.
- Clicking "Use" populates the existing fields for that platform.
- Quota counter shows "9/10 free optimizations left today" after one use.
- Errors show as red toasts, no white-screen.

**Common pitfalls:**
- Calling the function while the user is still typing the one-liner (debounce the button at the user level — only fire on click).
- Streaming is *nice-to-have*, not a Phase 1 must. Skip it for now.

---

## Task 1.6 — Optional: 30s transcript on upload

**Goal:** Better prompt context = better outputs. If you finish 1.1–1.5 with time to spare, add this.

Use Whisper via Groq (free, fast). New edge function `transcribe-video` triggered after upload, writes to `videos.transcript_snippet`. Non-blocking — if it fails, we still have a working app.

(Skip detailed steps here — ask the lead before starting since it's optional and adds scope.)

---

## Phase 1 wrap-up

```bash
bun run lint
bun run build
supabase functions deploy optimize-post --no-verify-jwt
supabase db push   # if migrations haven't been pushed yet
```
Deploy and test against staging. PR title: "Phase 1: AI optimize-post feature".

---

# PHASE 2 — Retention loop (overview)

After Phase 1 ships and works, the lead will hand off detailed steps. The shape:

1. **`pull-youtube-metrics` cron edge function** (every 6h) — pulls views/likes from YouTube Analytics API for posted videos, writes to a new `post_metrics` table.
2. **Dashboard "performance" widget** — SQL query joining `post_metrics` + `post_optimizations` to compute "AI-optimized posts get X× more views."
3. **"Optimize my last post" Dashboard card** — pinned card for the most recent un-optimized post.
4. **Weekly digest email** — Sunday cron, uses Resend (free tier 100/day). Best post of the week, 3 trending hooks, suggested post times.
5. **Streaks + content health score** — pure client-side calculation.
6. **Best-time-to-post** — SQL window function over `post_metrics`, no AI.

---

# PHASE 3 — Trending hashtags (overview)

1. **`refresh-trending` daily cron edge function** — hits YouTube Data API (`videos.list?chart=mostPopular`), regexes hashtags out of titles/descriptions, ranks by frequency, upserts into `trending_hashtags`.
2. **RapidAPI fallback for TikTok/IG** — once-a-day call to a free-tier endpoint, same table.
3. The optimize-post function in Phase 1 already reads from `trending_hashtags` — no changes there.

---

# PHASE 4 — Cost tightening (overview)

Only after we have ≥50 real users:

1. Track input/output tokens and dollar cost per optimization in `ai_usage`.
2. Build an internal `/admin/cost` page with daily breakdown.
3. Verify Anthropic prompt-cache hit rate >70% in production logs (look at the `usage.cache_read_input_tokens` field in API responses).
4. A/B test Gemini Flash vs Claude Haiku output quality on real users — measure by which captions get used (vs. edited/regenerated).

---

# House rules for this project

- **Branch per phase.** PRs against `main`, no direct pushes.
- **One concern per PR.** Don't sneak unrelated cleanups in.
- **No new dependencies without lead approval.** We have a lot already.
- **Test the unhappy path.** What happens if the AI call times out? The user is offline? The video has no transcript?
- **Never commit `.env*` files.** Check `git status` before every commit.
- **Ask early.** Two hours stuck is a slack message; two days stuck is a problem.

If you finish Phase 0 in less than half a day, you're going too fast — go back and verify acceptance criteria carefully. If Phase 1 takes longer than a week, raise it before week 2.
