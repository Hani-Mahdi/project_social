import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const socialPlatforms = [
  {
    name: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: "bg-white hover:bg-neutral-100 text-black",
  },
  {
    name: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "bg-white hover:bg-neutral-100 text-black",
  },
  {
    name: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: "bg-white hover:bg-neutral-100 text-black",
  },
  {
    name: "Twitter",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "bg-white hover:bg-neutral-100 text-black",
  },
];

interface UploadFabProps {
  onSelectPlatform?: (platform: string) => void;
}

export function UploadFab({ onSelectPlatform }: UploadFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (platform: string) => {
    onSelectPlatform?.(platform);
    setIsOpen(false);
  };

  return (
    <div 
      className="fixed bottom-16 right-8 z-50"
      onMouseEnter={() => !isOpen && setIsOpen(true)}
    >
      {/* Social platform icons - stacked as tower above plus button */}
      <AnimatePresence>
        {isOpen && (
          <>
            {socialPlatforms.map((platform, index) => (
              <motion.button
                key={platform.name}
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  y: -(index + 1) * 52
                }}
                exit={{ opacity: 0, scale: 0.5, y: 0 }}
                transition={{ 
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                  delay: index * 0.05 
                }}
                onClick={() => handleSelect(platform.name)}
                className={`absolute bottom-0 right-1.5 mb-4 w-11 h-11 rounded-full ${platform.color} flex items-center justify-center shadow-lg transition-colors`}
                title={platform.name}
              >
                {platform.icon}
              </motion.button>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Labels - appear after icons animate in */}
      <AnimatePresence>
        {isOpen && (
          <>
            {socialPlatforms.map((platform, index) => (
              <motion.span
                key={`label-${platform.name}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.2,
                  delay: 0.2 + index * 0.03
                }}
                className="absolute right-16 text-sm text-white font-medium whitespace-nowrap pointer-events-none"
                style={{ bottom: `${(index + 1) * 52 + 16}px` }}
              >
                {platform.name}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button - only closes when open */}
      <motion.button
        onClick={() => isOpen && setIsOpen(false)}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors z-10 ${
          isOpen 
            ? "bg-violet-500 text-white cursor-pointer" 
            : "bg-violet-600 hover:bg-violet-500 text-white"
        }`}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
