import { ScoreCard } from "./ScoreCard";
import { SuggestionCard } from "./SuggestionCard";
import { TrendingAudio } from "./TrendingAudio";
import { Zap, TrendingUp, MessageSquare, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisResultsProps {
  onReset: () => void;
}

export function AnalysisResults({ onReset }: AnalysisResultsProps) {
  // Mock data - in real app this would come from AI analysis
  const scores = [
    {
      icon: Zap,
      title: "Hook Strength",
      score: 6,
      status: "warning" as const,
      description: "Your first 2 seconds could be stronger. Viewers are scrolling past."
    },
    {
      icon: TrendingUp,
      title: "Retention Pacing",
      score: 8,
      status: "good" as const,
      description: "Great pacing throughout. Viewers are likely to stay till the end."
    },
    {
      icon: MessageSquare,
      title: "Caption Power",
      score: 5,
      status: "bad" as const,
      description: "Caption isn't driving action. Missing hooks and CTA."
    },
    {
      icon: Clock,
      title: "Optimal Length",
      score: 9,
      status: "good" as const,
      description: "Perfect length for your content type. Don't change this."
    }
  ];

  const suggestions = [
    {
      type: "hook" as const,
      title: "Rewrite your hook",
      original: "So I tried this new thing today...",
      suggestion: "I accidentally discovered the ONE trick that 10x'd my views",
      reason: "Starting with intrigue creates curiosity gaps. 'Accidentally' adds relatability.",
      impact: "high" as const
    },
    {
      type: "caption" as const,
      title: "Caption rewrite",
      original: "New video! Hope you like it 🙏",
      suggestion: "This changed everything for me. Save this before it blows up 🔥",
      reason: "Commands action (save), creates urgency (before it blows up), personal story hook.",
      impact: "high" as const
    },
    {
      type: "pacing" as const,
      title: "Add a pattern interrupt",
      suggestion: "At 0:08, add a quick zoom or cut to reset attention before the main reveal",
      reason: "Attention drops around 7-10 seconds. A visual interrupt resets the watch loop.",
      impact: "medium" as const
    }
  ];

  const trendingAudios = [
    {
      name: "Original Sound - storytelling hook",
      artist: "@viralcreator",
      uses: "45.2K",
      growth: "+340% this week",
      fit: "perfect" as const,
      reason: "Perfect for your storytelling style. Rising fast but not oversaturated yet."
    },
    {
      name: "Suspense Build",
      artist: "Trending Sounds",
      uses: "128K",
      growth: "+89% this week",
      fit: "good" as const,
      reason: "Works well with reveal-style content. Use for dramatic moments."
    }
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Analyze another</span>
        </button>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Re-analyze
        </Button>
      </div>

      {/* Overall score */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl gradient-primary shadow-glow mb-4">
          <span className="font-display text-4xl font-bold text-primary-foreground">7.0</span>
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Good potential</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          With a few targeted fixes, this video could perform significantly better. Focus on the high-impact suggestions below.
        </p>
      </div>

      {/* Score cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {scores.map((score, index) => (
          <ScoreCard key={index} {...score} />
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Suggestions */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">
            What to fix
          </h3>
          {suggestions.map((suggestion, index) => (
            <SuggestionCard key={index} {...suggestion} />
          ))}
        </div>

        {/* Trending audio */}
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">
            Trending audio
          </h3>
          <TrendingAudio audios={trendingAudios} />
        </div>
      </div>
    </div>
  );
}
