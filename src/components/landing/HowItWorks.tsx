import { Upload, Brain, Lightbulb, Rocket } from "lucide-react";
import { motion } from "framer-motion";

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

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-neutral-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Left spacer for alignment with Features */}
          <div className="hidden lg:block lg:w-[520px] flex-shrink-0" />
          
          {/* Right side - Flowchart */}
          <div className="flex-1">
            {/* Header - Right aligned */}
            <div className="text-right mb-12">
              <span className="text-sm font-medium text-neutral-500 mb-2 block">How it works</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Simple workflow
              </h2>
              <p className="text-muted-foreground">
                From upload to viral in minutes.
              </p>
            </div>

            {/* Animated Flowchart */}
            <div className="relative">
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Flow nodes */}
              <div className="flex flex-wrap justify-end gap-4">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    className="relative"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100
                    }}
                  >
                    {/* Connector arrow */}
                    {index < steps.length - 1 && (
                      <motion.div 
                        className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 items-center"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.15 + 0.3 }}
                      >
                        <div className="w-4 h-[2px] bg-gradient-to-r from-violet-400 to-violet-600" />
                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-violet-600" />
                      </motion.div>
                    )}

                    {/* Node card */}
                    <motion.div 
                      className="relative bg-white border-2 border-neutral-200 rounded-2xl p-5 w-32 text-center group cursor-pointer"
                      whileHover={{ 
                        scale: 1.05, 
                        borderColor: "#8b5cf6",
                        boxShadow: "0 10px 40px -10px rgba(139, 92, 246, 0.3)"
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Pulse ring on hover */}
                      <motion.div 
                        className="absolute inset-0 rounded-2xl border-2 border-violet-400"
                        initial={{ opacity: 0, scale: 1 }}
                        whileHover={{ 
                          opacity: [0, 0.5, 0],
                          scale: [1, 1.1, 1.2],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />

                      {/* Step number */}
                      <motion.div 
                        className="absolute -top-2 -right-2 w-6 h-6 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.3 }}
                      >
                        {index + 1}
                      </motion.div>

                      {/* Icon */}
                      <motion.div 
                        className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors"
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <step.icon className="w-6 h-6 text-neutral-600 group-hover:text-violet-600 transition-colors" />
                      </motion.div>

                      {/* Title */}
                      <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              {/* Animated data flow particles */}
              <div className="mt-8 flex justify-end">
                <motion.div 
                  className="flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div 
                    className="w-2 h-2 bg-violet-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-xs font-medium text-violet-700">Processing in real-time</span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
