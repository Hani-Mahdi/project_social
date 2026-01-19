import { Zap, TrendingUp, MessageSquare, BarChart3, Music, RefreshCw, Upload, Brain, Lightbulb, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const features = [
  {
    icon: Zap,
    title: "Hook Analysis",
    description: "AI scores your first 2 seconds. Get specific fixes to capture attention instantly."
  },
  {
    icon: TrendingUp,
    title: "Pacing Optimization",
    description: "Understand if your video drags or rushes. Get timing suggestions that keep viewers watching."
  },
  {
    icon: MessageSquare,
    title: "Caption Rewrites",
    description: "AI-powered caption suggestions optimized for your niche. Hooks, CTAs, and hashtags that work."
  },
  {
    icon: Music,
    title: "Trending Audio",
    description: "Audio trends filtered by your niche, before they peak, with context on how to use them."
  },
  {
    icon: BarChart3,
    title: "Performance Diagnosis",
    description: "Understand why posts fail. Plain-English explanations of what killed your reach."
  },
  {
    icon: RefreshCw,
    title: "Learn & Improve",
    description: "The system learns what works for you. Better suggestions over time, not generic advice."
  }
];

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop your video"
  },
  {
    icon: Brain,
    title: "Analyze",
    description: "AI processes"
  },
  {
    icon: Lightbulb,
    title: "Optimize",
    description: "Get fixes"
  },
  {
    icon: Rocket,
    title: "Post",
    description: "Go viral"
  }
];

export function FeaturesAndWorkflow() {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left side - Features Accordion */}
          <div className="lg:w-[480px] flex-shrink-0">
            <div className="mb-6">
              <span className="text-sm font-medium text-neutral-500 mb-2 block">Features</span>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                Everything you need
              </h2>
              <p className="text-sm text-muted-foreground">
                Stop guessing. Start understanding what makes content perform.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {features.map((feature, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-neutral-200 rounded-lg px-4 data-[state=open]:border-violet-200 data-[state=open]:bg-violet-50/30 transition-colors"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-neutral-600" />
                      </div>
                      <span className="font-medium text-left text-foreground text-sm">{feature.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 pl-11 text-muted-foreground text-xs leading-relaxed">
                    {feature.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right side - Workflow Snake Flowchart */}
          <div className="flex-1">
            <div className="text-right mb-8 lg:pr-4">
              <span className="text-sm font-medium text-neutral-500 mb-2 block">How it works</span>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                Simple workflow
              </h2>
              <p className="text-sm text-muted-foreground">
                From upload to viral in minutes.
              </p>
            </div>

            {/* Snake Pattern Flowchart - 2 per row */}
            <div className="relative">
              {/* Row 1: Steps 1 & 2 (left to right) */}
              <div className="flex gap-4 mb-4">
                {steps.slice(0, 2).map((step, index) => (
                  <motion.div
                    key={index}
                    className="flex-1 relative"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                  >
                    <motion.div 
                      className="bg-white border-2 border-neutral-200 rounded-lg p-3 group cursor-pointer h-full"
                      whileHover={{ 
                        borderColor: "#8b5cf6",
                        boxShadow: "0 8px 30px -10px rgba(139, 92, 246, 0.3)"
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="w-6 h-6 rounded bg-neutral-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                          <step.icon className="w-3 h-3 text-neutral-600 group-hover:text-violet-600 transition-colors" />
                        </div>
                      </div>
                      <h3 className="font-medium text-foreground text-xs">{step.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{step.description}</p>
                    </motion.div>

                    {/* Arrow to next (right) */}
                    {index === 0 && (
                      <motion.div 
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex items-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-violet-500" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Connector: down from step 2 to step 3 */}
              <motion.div 
                className="flex justify-end pr-[25%] mb-4"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-[2px] h-6 bg-gradient-to-b from-violet-500 to-violet-400" />
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-violet-400" />
                </div>
              </motion.div>

              {/* Row 2: Steps 3 & 4 (right to left - reversed) */}
              <div className="flex flex-row-reverse gap-4">
                {steps.slice(2, 4).map((step, index) => (
                  <motion.div
                    key={index + 2}
                    className="flex-1 relative"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (index + 2) * 0.15 }}
                  >
                    <motion.div 
                      className="bg-white border-2 border-neutral-200 rounded-lg p-3 group cursor-pointer h-full"
                      whileHover={{ 
                        borderColor: "#8b5cf6",
                        boxShadow: "0 8px 30px -10px rgba(139, 92, 246, 0.3)"
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {index + 3}
                        </div>
                        <div className="w-6 h-6 rounded bg-neutral-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                          <step.icon className="w-3 h-3 text-neutral-600 group-hover:text-violet-600 transition-colors" />
                        </div>
                      </div>
                      <h3 className="font-medium text-foreground text-xs">{step.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{step.description}</p>
                    </motion.div>

                    {/* Arrow to next (left) */}
                    {index === 0 && (
                      <motion.div 
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex items-center"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-violet-500" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Status indicator */}
              <motion.div 
                className="flex justify-end mt-6"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 border border-violet-200 rounded-full">
                  <motion.div 
                    className="w-2 h-2 bg-violet-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs font-medium text-violet-700">Real-time processing</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
