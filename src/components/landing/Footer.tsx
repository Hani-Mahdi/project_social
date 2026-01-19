import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="py-8 bg-neutral-950 border-t border-neutral-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-semibold text-white">GrowthCopilot</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-neutral-500 hover:text-white transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm text-neutral-500 hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-neutral-500">
            © 2026 GrowthCopilot
          </p>
        </div>
      </div>
    </footer>
  );
}
