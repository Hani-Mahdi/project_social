import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPerformanceComparison } from "@/lib/database";

export function PerformanceWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["performance-comparison"],
    queryFn: getPerformanceComparison,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;

  const enoughData = data.optimizedCount >= 1 && data.unoptimizedCount >= 1;
  if (!enoughData) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold">Performance tracking</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Optimize and post {Math.max(0, 1 - data.optimizedCount)} more video
          {data.optimizedCount === 0 ? "s" : ""} to see how AI optimization is performing for you.
        </p>
      </Card>
    );
  }

  const ratioStr = data.ratio >= 1
    ? `${data.ratio.toFixed(1)}x more`
    : `${(1 / data.ratio).toFixed(1)}x fewer`;
  const positive = data.ratio >= 1;

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Your AI-optimized posts get {ratioStr} views</h3>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold">{data.optimizedAvgViews.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">
            Avg views, AI-optimized ({data.optimizedCount})
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold">{data.unoptimizedAvgViews.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">
            Avg views, no optimization ({data.unoptimizedCount})
          </div>
        </div>
      </div>
      {!positive && (
        <p className="mt-4 text-xs text-muted-foreground">
          Sample is small - keep posting to get a clearer picture.
        </p>
      )}
    </Card>
  );
}
