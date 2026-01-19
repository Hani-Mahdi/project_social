import { useState } from "react";
import { Zap, TrendingUp, MessageSquare, BarChart3, Music, RefreshCw, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const leftFeatures = [
  {
    icon: Zap,
    title: "Hook Analysis",
    description: "AI scores your first 2 seconds. Get specific fixes to capture attention instantly.",
    details: "We analyze viewer drop-off patterns and compare your hooks against top-performing content in your niche. Get frame-by-frame feedback on what's working and what's not."
  },
  {
    icon: TrendingUp,
    title: "Pacing Optimization",
    description: "Understand if your video drags or rushes. Get timing suggestions that keep viewers watching.",
    details: "Our AI maps engagement curves and identifies exactly where viewers lose interest. Receive specific timestamps and suggestions for cuts, transitions, and rhythm changes."
  },
  {
    icon: MessageSquare,
    title: "Caption Rewrites",
    description: "AI-powered caption suggestions optimized for your niche. Hooks, CTAs, and hashtags that work.",
    details: "We analyze what's driving engagement in your space and apply those patterns to your content. Get multiple caption variations with predicted performance scores."
  }
];

const rightFeatures = [
  {
    icon: Music,
    title: "Trending Audio",
    description: "Audio trends filtered by your niche, before they peak, with context on how to use them.",
    details: "Get notified when sounds are gaining momentum so you can ride the wave early. We track audio velocity across millions of posts to spot trends before they saturate."
  },
  {
    icon: BarChart3,
    title: "Performance Diagnosis",
    description: "Understand why posts fail. Plain-English explanations of what killed your reach.",
    details: "We break down algorithm signals and show you exactly what to fix for your next post. No more guessing - get data-driven insights on every aspect of your content."
  },
  {
    icon: RefreshCw,
    title: "Learn & Improve",
    description: "The system learns what works for you. Better suggestions over time, not generic advice.",
    details: "Your personal AI model improves with every video you analyze. The more you use it, the more tailored and accurate your recommendations become."
  }
];

function AccordionColumn({ features, startIndex }: { features: typeof leftFeatures; startIndex: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      {features.map((feature, index) => {
        const isOpen = openIndex === index;
        const Icon = feature.icon;
        const displayIndex = startIndex + index;
        
        return (
          <div
            key={index}
            className={`border-b border-neutral-800 ${index === 0 ? "border-t" : ""}`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full py-6 flex items-center gap-5 text-left group"
            >
              {/* Number indicator */}
              <span className={`text-base font-mono transition-colors ${isOpen ? "text-violet-400" : "text-neutral-600"}`}>
                {String(displayIndex + 1).padStart(2, "0")}
              </span>
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${isOpen ? "bg-violet-600" : "bg-neutral-700 group-hover:bg-neutral-600"}`}>
                <Icon className="w-7 h-7 text-white transition-colors" />
              </div>
              
              {/* Title */}
              <span className={`flex-grow text-lg font-semibold transition-colors ${isOpen ? "text-white" : "text-neutral-300"}`}>
                {feature.title}
              </span>
              
              {/* Toggle icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? "bg-violet-600" : "bg-neutral-800"}`}>
                {isOpen ? (
                  <Minus className="w-4 h-4 text-white" />
                ) : (
                  <Plus className="w-4 h-4 text-neutral-500" />
                )}
              </div>
            </button>
            
            {/* Content */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pb-6 pl-[6.5rem]">
                    <p className="text-base text-neutral-400 leading-relaxed mb-3">
                      {feature.description}
                    </p>
                    <p className="text-base text-neutral-300 leading-relaxed">
                      {feature.details}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 bg-neutral-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-violet-400 mb-3 tracking-wide uppercase">
            Features
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-neutral-400">
            Stop guessing. Start understanding exactly what makes content perform.
          </p>
        </div>

        {/* Two Column Accordion */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <AccordionColumn features={leftFeatures} startIndex={0} />
          <AccordionColumn features={rightFeatures} startIndex={3} />
        </div>
      </div>
    </section>
  );
}
