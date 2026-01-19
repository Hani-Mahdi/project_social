import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Handle scroll effect
  useState(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-bold text-lg text-white">
              GrowthCopilot
            </span>
          </Link>

          {/* Nav links - Desktop */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              <a
                href="#features"
                className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                How it works
              </a>
              <a
                href="#pricing"
                className="px-4 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                Pricing
              </a>
            </div>
          </div>

          {/* CTA - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="text-neutral-300 hover:text-white hover:bg-white/10 rounded-full px-4"
            >
              Log in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-5 transition-all"
            >
              <span className="flex items-center gap-1.5">
                Get started
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-80 border-t border-white/5" : "max-h-0"
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-3 bg-neutral-950/95 backdrop-blur-xl">
          <a
            href="#features"
            className="block px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="block px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            How it works
          </a>
          <a
            href="#pricing"
            className="block px-4 py-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Pricing
          </a>
          <div className="pt-3 border-t border-white/5 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="flex-1 text-neutral-300 hover:text-white hover:bg-white/10 rounded-full"
            >
              Log in
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="flex-1 bg-violet-600 text-white rounded-full"
            >
              Get started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
