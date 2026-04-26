import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMostRecentUnoptimizedVideo } from "@/lib/database";

export function OptimizeLastPostCard() {
  const navigate = useNavigate();
  const { data: video, isLoading } = useQuery({
    queryKey: ["most-recent-unoptimized"],
    queryFn: getMostRecentUnoptimizedVideo,
  });

  if (isLoading || !video) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Suggested next step
          </div>
          <h3 className="mt-2 font-semibold">Optimize "{video.title || "your latest video"}"</h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
