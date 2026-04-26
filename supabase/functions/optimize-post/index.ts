import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateOptimization, type OptimizationInput, type OptimizationPlatform } from "../_shared/ai.ts";

const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((origin) => origin.trim()) ?? [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const normalizedOrigin = origin?.replace(/\/$/, "") ?? null;
  const isLocalhost = normalizedOrigin?.startsWith("http://localhost:") ||
    normalizedOrigin?.startsWith("https://localhost:") ||
    normalizedOrigin?.startsWith("http://127.0.0.1:") ||
    normalizedOrigin?.startsWith("https://127.0.0.1:");
  const isAllowed = Boolean(
    normalizedOrigin && (
      isLocalhost ||
      allowedOrigins.some((allowed) => {
        const normalizedAllowed = allowed.replace(/\/$/, "");
        return (
          normalizedOrigin === normalizedAllowed ||
          normalizedOrigin.endsWith(normalizedAllowed.replace(/^https?:\/\//, ""))
        );
      })
    ),
  );

  return {
    "Access-Control-Allow-Origin": isAllowed && normalizedOrigin ? normalizedOrigin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const FREE_DAILY_LIMIT = 10;
const VALID_PLATFORMS: OptimizationPlatform[] = ["tiktok", "instagram", "youtube", "twitter"];

serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    if (req.method !== "POST") {
      return errorJson("method_not_allowed", "Use POST", 405, headers);
    }

    const auth = req.headers.get("Authorization");
    if (!auth) return errorJson("missing_auth", "Missing Authorization header", 401, headers);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return errorJson("config_missing", "Supabase env not configured", 500, headers);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return errorJson("unauthorized", "Invalid session", 401, headers);
    }
    const user = userData.user;

    let body: { video_id?: string; one_liner?: string; platforms?: unknown };
    try {
      body = await req.json();
    } catch {
      return errorJson("invalid_json", "Request body is not valid JSON", 400, headers);
    }

    const { video_id, one_liner } = body;
    const platforms = sanitizePlatforms(body.platforms);

    if (!video_id || typeof video_id !== "string") {
      return errorJson("missing_video_id", "video_id is required", 400, headers);
    }
    if (platforms.length === 0) {
      return errorJson("missing_platforms", "Provide at least one valid platform", 400, headers);
    }

    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    let usageTrackingEnabled = true;
    const { data: usageRow, error: usageReadError } = await supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("day", today)
      .maybeSingle();
    if (usageReadError) {
      usageTrackingEnabled = false;
      console.warn("ai_usage unavailable, skipping quota check:", usageReadError.message);
    } else {
      count = usageRow?.count ?? 0;
    }

    if (usageTrackingEnabled && count >= FREE_DAILY_LIMIT) {
      return errorJson("quota_exceeded", "Daily limit reached", 429, headers, { limit: FREE_DAILY_LIMIT });
    }

    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .select("id, title")
      .eq("id", video_id)
      .maybeSingle();
    if (videoErr) {
      console.warn("videos lookup failed:", videoErr.message);
      return errorJson("video_lookup_failed", videoErr.message, 500, headers);
    }
    if (!video) {
      return errorJson("video_not_found", "Video not found or access denied", 404, headers);
    }

    const inputHash = await sha256(JSON.stringify({
      one_liner: one_liner ?? "",
      platforms,
    }));

    const { data: cached, error: cacheReadError } = await supabase
      .from("optimization_cache")
      .select("result")
      .eq("video_id", video_id)
      .eq("input_hash", inputHash)
      .maybeSingle();
    if (cacheReadError) {
      console.warn("optimization_cache unavailable, skipping cache read:", cacheReadError.message);
    } else if (cached?.result) {
      return json({ result: cached.result, cached: true }, 200, headers);
    }

    const trending: Record<string, string[]> = {};
    for (const platform of platforms) {
      const { data: rows, error: trendingError } = await supabase
        .from("trending_hashtags")
        .select("hashtag")
        .eq("platform", platform)
        .order("rank")
        .limit(15);
      if (trendingError) {
        console.warn(`trending_hashtags unavailable for ${platform}:`, trendingError.message);
      }
      trending[platform] = rows?.map((row) => row.hashtag) ?? [];
    }

    const input: OptimizationInput = {
      videoTitle: video.title ?? "",
      oneLiner: typeof one_liner === "string" ? one_liner : "",
      transcriptSnippet: "",
      platforms,
      trendingHashtags: trending,
    };

    let result;
    try {
      result = await generateOptimization(input);
    } catch (aiErr) {
      const detail = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.error("AI generation failed:", detail);
      return errorJson("ai_generation_failed", "AI provider failed to generate suggestions", 502, headers, { detail });
    }

    const { error: cacheWriteError } = await supabase.from("optimization_cache").insert({
      video_id,
      input_hash: inputHash,
      result,
      ai_model: Deno.env.get("AI_PROVIDER") ?? "gemini",
    });
    if (cacheWriteError) {
      console.warn("optimization_cache unavailable, skipping cache write:", cacheWriteError.message);
    }

    if (usageTrackingEnabled) {
      const { error: usageWriteError } = await supabase.from("ai_usage").upsert(
        { user_id: user.id, day: today, count: count + 1 },
        { onConflict: "user_id,day" },
      );
      if (usageWriteError) {
        console.warn("ai_usage unavailable, skipping usage update:", usageWriteError.message);
      }
    }

    return json(
      {
        result,
        cached: false,
        usage: usageTrackingEnabled ? { count: count + 1, limit: FREE_DAILY_LIMIT } : undefined,
      },
      200,
      headers,
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("optimize-post unhandled error:", detail);
    return errorJson("internal_error", detail, 500, headers);
  }
});

function sanitizePlatforms(input: unknown): OptimizationPlatform[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<OptimizationPlatform>();
  for (const value of input) {
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if ((VALID_PLATFORMS as string[]).includes(lower)) {
        set.add(lower as OptimizationPlatform);
      }
    }
  }
  return [...set];
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function errorJson(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>,
  extra?: Record<string, unknown>,
) {
  return json({ error: message, code, ...(extra ?? {}) }, status, headers);
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
