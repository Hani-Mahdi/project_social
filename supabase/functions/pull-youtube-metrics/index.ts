import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ConnectedAccount {
  user_id: string;
  refresh_token: string | null;
}

interface PostedYouTubePost {
  id: string;
  platform_post_id: string | null;
}

interface YouTubeVideoItem {
  id: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth.includes(expectedKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("user_id, refresh_token")
    .eq("platform", "youtube");

  let processed = 0;
  let errors = 0;

  for (const account of (accounts as ConnectedAccount[] | null) ?? []) {
    try {
      if (!account.refresh_token) {
        errors++;
        continue;
      }

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

      await supabase
        .from("connected_accounts")
        .update({
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
        })
        .eq("user_id", account.user_id)
        .eq("platform", "youtube");

      const { data: posts } = await supabase
        .from("posts")
        .select("id, platform_post_id, video:videos!inner(user_id)")
        .eq("platform", "youtube")
        .eq("status", "posted")
        .not("platform_post_id", "is", null)
        .eq("video.user_id", account.user_id);

      const typedPosts = (posts as PostedYouTubePost[] | null) ?? [];
      if (!typedPosts.length) continue;

      const ids = typedPosts
        .map((post) => post.platform_post_id)
        .filter((id): id is string => Boolean(id))
        .join(",");

      if (!ids) continue;

      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${ids}&part=statistics`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      const ytData = await ytRes.json();

      for (const item of (ytData.items as YouTubeVideoItem[] | undefined) ?? []) {
        const post = typedPosts.find((candidate) => candidate.platform_post_id === item.id);
        if (!post) continue;

        const stats = item.statistics ?? {};
        await supabase.from("post_metrics").insert({
          post_id: post.id,
          views: Number.parseInt(stats.viewCount ?? "0", 10),
          likes: Number.parseInt(stats.likeCount ?? "0", 10),
          comments: Number.parseInt(stats.commentCount ?? "0", 10),
        });
        processed++;
      }
    } catch (error) {
      console.error(`Failed for user ${account.user_id}:`, error);
      errors++;
    }
  }

  return new Response(JSON.stringify({ processed, errors }), { status: 200 });
});
