import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  icon: LucideIcon;
  title: string;
  score: number;
  status: "good" | "warning" | "bad";
  description: string;
}

export function ScoreCard({ icon: Icon, title, score, status, description }: ScoreCardProps) {
  const statusStyles = {
    good: {
      bg: "bg-success/10",
      text: "text-success",
      ring: "ring-success/20",
      bar: "bg-success"
    },
    warning: {
      bg: "bg-warning/10",
      text: "text-warning",
      ring: "ring-warning/20",
      bar: "bg-warning"
    },
    bad: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      ring: "ring-destructive/20",
      bar: "bg-destructive"
    }
  };

  const styles = statusStyles[status];

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", styles.bg)}>
          <Icon className={cn("w-5 h-5", styles.text)} />
        </div>
        <div className={cn("px-3 py-1 rounded-full text-sm font-bold ring-1", styles.bg, styles.text, styles.ring)}>
          {score}/10
        </div>
      </div>
      
      <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", styles.bar)}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}
