import { Music, TrendingUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrendingAudioProps {
  audios: {
    name: string;
    artist: string;
    uses: string;
    growth: string;
    fit: "perfect" | "good" | "okay";
    reason: string;
  }[];
}

export function TrendingAudio({ audios }: TrendingAudioProps) {
  const fitStyles = {
    perfect: { bg: "bg-success/10", text: "text-success", label: "Perfect fit" },
    good: { bg: "bg-primary/10", text: "text-primary", label: "Good fit" },
    okay: { bg: "bg-muted", text: "text-muted-foreground", label: "Could work" }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Music className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Trending for your niche</h3>
          <p className="text-sm text-muted-foreground">Audios that match your content style</p>
        </div>
      </div>

      <div className="space-y-4">
        {audios.map((audio, index) => {
          const styles = fitStyles[audio.fit];
          return (
            <div 
              key={index}
              className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium text-foreground">{audio.name}</h4>
                  <p className="text-sm text-muted-foreground">{audio.artist}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
                  {styles.label}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm mb-3">
                <span className="text-muted-foreground">{audio.uses} uses</span>
                <span className="flex items-center gap-1 text-success">
                  <TrendingUp className="w-3 h-3" />
                  {audio.growth}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{audio.reason}</p>

              <Button variant="outline" size="sm" className="w-full group">
                Find on TikTok
                <ExternalLink className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
