import { cn } from "@/lib/utils";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";

interface SuggestionCardProps {
  type: "hook" | "caption" | "audio" | "pacing";
  title: string;
  original?: string;
  suggestion: string;
  reason: string;
  impact: "high" | "medium" | "low";
}

export function SuggestionCard({ type, title, original, suggestion, reason, impact }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const impactStyles = {
    high: { bg: "bg-primary/10", text: "text-primary", label: "High impact" },
    medium: { bg: "bg-warning/10", text: "text-warning", label: "Medium impact" },
    low: { bg: "bg-muted", text: "text-muted-foreground", label: "Low impact" }
  };

  const typeEmoji = {
    hook: "🎯",
    caption: "✍️",
    audio: "🎵",
    pacing: "⏱️"
  };

  const styles = impactStyles[impact];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeEmoji[type]}</span>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
        </div>
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles.bg, styles.text)}>
          {styles.label}
        </span>
      </div>

      {/* Before/After */}
      {original && (
        <div className="space-y-3 mb-4">
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
            <span className="text-xs font-medium text-destructive uppercase tracking-wider">Before</span>
            <p className="text-sm text-foreground mt-1 line-through opacity-60">{original}</p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Suggestion */}
      <div className="p-3 rounded-xl bg-success/5 border border-success/10 mb-4">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-success uppercase tracking-wider">
            {original ? "After" : "Suggestion"}
          </span>
          <button 
            onClick={handleCopy}
            className="p-1 rounded-lg hover:bg-success/10 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <p className="text-sm text-foreground mt-1 font-medium">{suggestion}</p>
      </div>

      {/* Reason */}
      <div className="flex items-start gap-2">
        <span className="text-xs mt-0.5">💡</span>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}
