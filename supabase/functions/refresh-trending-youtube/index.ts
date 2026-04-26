import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface YouTubeSnippetItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
  };
}

interface TrendingHashtagRow {
  niche: string;
  platform: string;
  hashtag: string;
  rank: number;
  source: string;
}

const HASHTAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_]{1,49})/g;
const TOP_N = 50;
const REGION = "US";

serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!isServiceRoleRequest(auth, expectedKey)) {
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
    const url =
      `https://www.googleapis.com/youtube/v3/videos?chart=mostPopular&regionCode=${REGION}&maxResults=50&part=snippet&key=${apiKey}`;
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

    const counts = new Map<string, number>();
    for (const item of items) {
      const haystack = `${item.snippet?.title ?? ""} ${item.snippet?.description ?? ""}`;
      const matches = haystack.matchAll(HASHTAG_REGEX);

      for (const match of matches) {
        const hashtag = match[1].toLowerCase();
        counts.set(hashtag, (counts.get(hashtag) ?? 0) + 1);
      }
    }

    const ranked: TrendingHashtagRow[] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([hashtag], index) => ({
        niche: "general",
        platform: "youtube",
        hashtag,
        rank: index + 1,
        source: "youtube_data_api_most_popular",
      }));

    const { error: deleteError } = await supabase
      .from("trending_hashtags")
      .delete()
      .eq("platform", "youtube");
    if (deleteError) throw deleteError;

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, note: "No hashtags found in today's trending videos" }),
        { status: 200 },
      );
    }

    const { error: insertError } = await supabase
      .from("trending_hashtags")
      .insert(ranked);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ inserted: ranked.length, top: ranked.slice(0, 5) }),
      { status: 200 },
    );
  } catch (error) {
    console.error("refresh-trending-youtube failed:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500 },
    );
  }
});

function isServiceRoleRequest(authHeader: string, expectedKey: string): boolean {
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return false;

  // Allow exact match when caller sends the service key directly.
  if (token === expectedKey) return true;

  // Also allow valid service_role JWTs (cron/manual invocation may use them).
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;

    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, "="));
    const payload = JSON.parse(payloadJson) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}
