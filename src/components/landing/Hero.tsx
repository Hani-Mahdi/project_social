import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dark base background */}
      <div className="absolute inset-0 bg-neutral-900" />
      
      {/* Full dashboard background */}
      <div className="absolute inset-0 p-6">
        <div className="w-full h-full bg-neutral-800 rounded-2xl border border-neutral-700 p-5 overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="flex-1 mx-6 h-7 bg-neutral-700 rounded-lg" />
            <div className="w-20 h-7 bg-violet-600/40 rounded-lg" />
          </div>
          
          {/* Dashboard layout */}
          <div className="grid grid-cols-6 gap-4 h-[calc(100%-3.5rem)]">
            {/* Sidebar */}
            <div className="col-span-1 space-y-2">
              <div className="h-9 bg-neutral-700 rounded-lg" />
              <div className="h-7 bg-neutral-700/60 rounded-lg" />
              <div className="h-7 bg-neutral-700/60 rounded-lg" />
              <div className="h-7 bg-violet-600/30 rounded-lg border border-violet-500/30" />
              <div className="h-7 bg-neutral-700/60 rounded-lg" />
              <div className="h-7 bg-neutral-700/60 rounded-lg" />
            </div>
            
            {/* Main content */}
            <div className="col-span-5 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-neutral-700 rounded-xl p-3">
                    <div className="w-10 h-2 bg-neutral-600 rounded mb-2" />
                    <div className={`w-14 h-5 ${i === 2 ? 'bg-violet-600/40' : 'bg-neutral-600'} rounded`} />
                  </div>
                ))}
              </div>
              
              {/* Charts row - Line graph and Circle graph */}
              <div className="grid grid-cols-3 gap-4">
                {/* Line Graph */}
                <div className="col-span-2 h-56 bg-neutral-700 rounded-xl p-4">
                  <div className="w-28 h-3 bg-neutral-600 rounded mb-4" />
                  <svg className="w-full h-40" viewBox="0 0 400 150" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line 
                        key={i}
                        x1="0" 
                        y1={i * 37.5} 
                        x2="400" 
                        y2={i * 37.5} 
                        stroke="#525252" 
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                    ))}
                    {/* Line graph path */}
                    <path
                      d="M 0 120 L 40 100 L 80 110 L 120 70 L 160 80 L 200 40 L 240 50 L 280 30 L 320 45 L 360 20 L 400 35"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Area under line */}
                    <path
                      d="M 0 120 L 40 100 L 80 110 L 120 70 L 160 80 L 200 40 L 240 50 L 280 30 L 320 45 L 360 20 L 400 35 L 400 150 L 0 150 Z"
                      fill="url(#gradient)"
                      opacity="0.3"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Circle/Donut Graph */}
                <div className="col-span-1 h-56 bg-neutral-700 rounded-xl p-4 flex flex-col items-center justify-center">
                  <div className="w-20 h-3 bg-neutral-600 rounded mb-4 self-start" />
                  <svg className="w-32 h-32" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#525252"
                      strokeWidth="12"
                    />
                    {/* Purple segment - 65% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="12"
                      strokeDasharray="163 251"
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                      strokeLinecap="round"
                    />
                    {/* Center text */}
                    <text x="50" y="50" textAnchor="middle" dy="0.35em" fill="#fff" fontSize="16" fontWeight="bold">
                      65%
                    </text>
                  </svg>
                  {/* Legend */}
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-xs text-neutral-400">Active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-neutral-500" />
                      <span className="text-xs text-neutral-400">Other</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-neutral-700 rounded-xl" />
                <div className="h-24 bg-neutral-700 rounded-xl" />
                <div className="h-24 bg-neutral-700 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full page glass overlay */}
      <div className="absolute inset-0 backdrop-blur-md bg-neutral-950/60" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <span className="inline-block px-3 py-1 text-xs font-medium text-neutral-300 border border-neutral-600 rounded-full mb-8">
            AI-Powered Content Analysis
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Know what works
            <br />
            <span className="text-violet-400">before you post</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-300 mb-10 max-w-xl mx-auto leading-relaxed">
            Get instant AI feedback on your videos. Fix hooks, pacing, and captions before they flop.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? "/dashboard" : "/auth"}>
              <Button 
                size="lg" 
                className="bg-violet-600 text-white hover:bg-violet-500 px-8"
              >
                Get started free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="ghost"
                size="lg"
                className="text-neutral-300 hover:text-white hover:bg-white/10"
              >
                <Play className="w-4 h-4 mr-2" />
                See how it works
              </Button>
            </a>
          </div>

          <p className="mt-8 text-sm text-neutral-500">
            No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
