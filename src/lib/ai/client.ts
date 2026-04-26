import { supabase } from "@/lib/supabase";
import type { Platform } from "@/lib/database";

interface OptimizePostInput {
  videoId: string;
  oneLiner: string;
  platforms: Platform[];
}

export interface OptimizationResultItem {
  title: string;
  caption: string;
  hashtags: string[];
  hook: string;
}

export interface OptimizePostResponse {
  result: Record<string, OptimizationResultItem>;
  cached: boolean;
  usage?: { count: number; limit: number };
}

export class OptimizePostError extends Error {
  status: number;
  code?: string;
  detail?: string;
  constructor(message: string, status: number, code?: string, detail?: string) {
    super(message);
    this.name = "OptimizePostError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function optimizePost(input: OptimizePostInput): Promise<OptimizePostResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) throw new OptimizePostError("Please sign in again", 401, "no_session");

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_KEY || "").trim();
  if (!baseUrl || !anonKey) {
    throw new OptimizePostError("Supabase is not configured", 500, "config_missing");
  }

  const url = `${baseUrl}/functions/v1/optimize-post`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        video_id: input.videoId,
        one_liner: input.oneLiner,
        platforms: input.platforms,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new OptimizePostError(`Could not reach optimize-post: ${message}`, 0, "network_error");
  }

  const raw = await res.text();
  let body: { error?: string; code?: string; detail?: string; result?: unknown; cached?: boolean; usage?: { count: number; limit: number } } | null = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message = body?.error || raw || `Request failed (${res.status})`;
    throw new OptimizePostError(message, res.status, body?.code, body?.detail);
  }

  if (!body || !body.result) {
    throw new OptimizePostError("Optimize-post returned an empty response", 502, "empty_response");
  }

  return body as unknown as OptimizePostResponse;
}
