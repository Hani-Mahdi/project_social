import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORMS } from "@/constants/platforms";
import type { Platform } from "@/lib/database";
import type { OptimizationResultItem } from "@/lib/ai/client";

interface OptimizationPanelProps {
  result: Record<string, OptimizationResultItem>;
  onUse: (platform: Platform, value: OptimizationResultItem) => void;
  onEdit: (platform: Platform, value: OptimizationResultItem) => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

const platformOrder: Platform[] = ["tiktok", "instagram", "youtube", "twitter"];

export function OptimizationPanel({
  result,
  onUse,
  onEdit,
  onRegenerate,
  isRegenerating = false,
}: OptimizationPanelProps) {
  const availablePlatforms = platformOrder.filter((platform) => Boolean(result[platform]));

  if (availablePlatforms.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">AI Suggestions</h2>
        <Button
          type="button"
          variant="outline"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800"
        >
          {isRegenerating ? "Regenerating..." : "Regenerate all"}
        </Button>
      </div>

      <div className="space-y-3">
        {availablePlatforms.map((platform) => {
          const item = result[platform];
          const config = PLATFORMS[platform];
          const Icon = config.icon;

          return (
            <Card key={platform} className="border-neutral-800 bg-neutral-900/70 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: config.gradient }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  {config.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-neutral-400">Title</p>
                  <p className="text-sm text-neutral-100">{item.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-neutral-400">Hook</p>
                  <p className="text-sm text-neutral-100">{item.hook}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-neutral-400">Caption</p>
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap">{item.caption}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.hashtags.map((hashtag) => (
                    <span
                      key={hashtag}
                      className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-200"
                    >
                      {hashtag}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  type="button"
                  onClick={() => onUse(platform, item)}
                  className="bg-violet-600 text-white hover:bg-violet-500"
                >
                  Use
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit(platform, item)}
                  className="border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800"
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
