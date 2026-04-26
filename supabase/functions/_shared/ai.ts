export type OptimizationPlatform = "tiktok" | "instagram" | "youtube" | "twitter";

export interface OptimizationInput {
  videoTitle: string;
  oneLiner: string;
  transcriptSnippet?: string;
  platforms: OptimizationPlatform[];
  trendingHashtags: Record<string, string[]>;
}

export interface PlatformOutput {
  title: string;
  caption: string;
  hashtags: string[];
  hook: string;
}

export type OptimizationOutput = Record<string, PlatformOutput>;

const SYSTEM_PROMPT = `You are an expert social media content optimizer.
Given a video, produce platform-specific titles, captions, hashtags, and opening hooks.

Rules per platform:
- TikTok: caption max 150 chars, 3-5 hashtags, attention-grabbing hook in first line
- Instagram Reels: caption can be longer (up to 2200 chars), 8-15 hashtags, story-driven
- YouTube Shorts: title under 60 chars (SEO-optimized), description with relevant keywords, 3-5 hashtags
- Twitter/X: under 280 chars total INCLUDING hashtags, 1-2 hashtags max

Return STRICT JSON matching the schema. No prose, no markdown.`;

export async function generateOptimization(input: OptimizationInput): Promise<OptimizationOutput> {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "gemini").toLowerCase();
  if (provider === "gemini") return callGemini(input);
  if (provider === "anthropic") return callAnthropic(input);
  throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}

const GEMINI_MODELS = (Deno.env.get("GEMINI_MODELS")?.split(",").map((m) => m.trim()).filter(Boolean))
  ?? ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function callGemini(input: OptimizationInput): Promise<OptimizationOutput> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the optimize-post function");

  const userPrompt = buildUserPrompt(input);
  let lastErr: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (!res.ok) {
        const detail = await safeReadText(res);
        if (res.status === 404 || res.status === 400 || res.status === 429) {
          lastErr = new Error(`Gemini ${model} ${res.status}: ${truncate(detail, 200)}`);
          continue;
        }
        throw new Error(`Gemini ${model} ${res.status}: ${truncate(detail, 300)}`);
      }

      const data = await res.json();
      const text = extractGeminiText(data);
      if (!text) throw new Error(`Gemini ${model} returned no content`);
      return normalizeOutput(parseJsonLoose(text), input.platforms);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (err instanceof SyntaxError) continue;
    }
  }

  throw lastErr ?? new Error("Gemini call failed for unknown reasons");
}

async function callAnthropic(input: OptimizationInput): Promise<OptimizationOutput> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the optimize-post function");

  const userPrompt = buildUserPrompt(input);
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
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`Anthropic ${res.status}: ${truncate(detail, 300)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Anthropic returned no content");
  return normalizeOutput(parseJsonLoose(text), input.platforms);
}

function buildUserPrompt(input: OptimizationInput): string {
  return JSON.stringify({
    video_title: input.videoTitle,
    one_liner: input.oneLiner,
    transcript_snippet: input.transcriptSnippet ?? "",
    target_platforms: input.platforms,
    trending_hashtags_by_platform: input.trendingHashtags,
    output_format: {
      tiktok: { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      instagram: { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      youtube: { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
      twitter: { title: "string", caption: "string", hashtags: ["string"], hook: "string" },
    },
  }, null, 2);
}

function extractGeminiText(data: unknown): string | null {
  const candidate = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts.map((part) => part?.text ?? "").join("").trim() || null;
}

function parseJsonLoose(raw: string): OptimizationOutput {
  const cleaned = stripFences(raw).trim();
  try {
    return JSON.parse(cleaned) as OptimizationOutput;
  } catch (err) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as OptimizationOutput;
    }
    throw new Error(`AI response was not valid JSON: ${truncate(cleaned, 200)} (${(err as Error).message})`);
  }
}

function stripFences(input: string): string {
  return input
    .replace(/^\s*```(?:json|JSON)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "");
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function normalizeOutput(
  output: OptimizationOutput,
  platforms: OptimizationPlatform[],
): OptimizationOutput {
  const normalized: OptimizationOutput = {};

  for (const platform of platforms) {
    const candidate = output[platform];
    normalized[platform] = {
      title: candidate?.title ?? "",
      caption: candidate?.caption ?? "",
      hashtags: Array.isArray(candidate?.hashtags) ? candidate.hashtags : [],
      hook: candidate?.hook ?? "",
    };
  }

  return normalized;
}
