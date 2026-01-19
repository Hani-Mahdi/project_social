import { Upload, Brain, Lightbulb, Rocket, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Upload Your Content",
    description: "Drop your video or paste a link. We support all major platforms and formats.",
    detail: "TikTok, Reels, Shorts, or raw video files"
  },
  {
    icon: Brain,
    number: "02",
    title: "AI Analysis",
    description: "Our AI breaks down every element - hooks, pacing, audio, captions, and more.",
    detail: "Processing takes under 30 seconds"
  },
  {
    icon: Lightbulb,
    number: "03",
    title: "Get Actionable Insights",
    description: "Receive specific, prioritized fixes. Not vague tips - exact changes to make.",
    detail: "Personalized to your niche and style"
  },
  {
    icon: Rocket,
    number: "04",
    title: "Post & Track",
    description: "Apply the fixes and watch your content perform. Track improvements over time.",
    detail: "See your growth metrics improve"
  }
];

export function Workflow() {
  return (
    <section id="how-it-works" className="py-24 bg-neutral-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-sm font-medium mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
            Simple Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            How it works
          </h2>
          <p className="text-lg text-neutral-400">
            From upload to viral-ready in minutes. No complexity, just results.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500 via-violet-500/50 to-transparent md:-translate-x-px" />
            
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className={`relative flex items-start gap-8 mb-16 last:mb-0 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Timeline dot */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                  <motion.div 
                    className="w-4 h-4 rounded-full bg-violet-500 ring-4 ring-neutral-950 shadow-lg shadow-violet-500/50"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                  />
                </div>
                
                {/* Content card */}
                <div className={`ml-20 md:ml-0 md:w-[calc(50%-3rem)] ${index % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                  <motion.div 
                    className="group relative bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-violet-500/30 hover:bg-neutral-900/80 transition-all duration-300"
                    whileHover={{ y: -4 }}
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Step number */}
                    <span className="absolute -top-3 left-6 md:left-auto md:right-6 px-2 py-0.5 bg-violet-500 text-white text-xs font-bold rounded-md shadow-lg shadow-violet-500/30">
                      {step.number}
                    </span>
                    
                    {/* Icon */}
                    <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/25 ${index % 2 === 0 ? "md:ml-auto" : ""}`}>
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    {/* Text */}
                    <h3 className="relative text-xl font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="relative text-neutral-400 mb-3">
                      {step.description}
                    </p>
                    
                    {/* Detail tag */}
                    <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {step.detail}
                    </span>
                  </motion.div>
                </div>
                
                {/* Spacer for alternating layout */}
                <div className="hidden md:block md:w-[calc(50%-3rem)]" />
              </motion.div>
            ))}
          </div>
          
          {/* Bottom CTA */}
          <motion.div 
            className="text-center mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
              <motion.div 
                className="w-2.5 h-2.5 bg-emerald-400 rounded-full"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-sm font-medium text-neutral-300">
                Average time from upload to insights: <span className="text-violet-400 font-bold">27 seconds</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
