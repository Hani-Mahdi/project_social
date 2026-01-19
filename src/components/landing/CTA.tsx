import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function CTA() {
  const { user } = useAuth();

  return (
    <section className="py-20 bg-neutral-900">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to grow your audience?
          </h2>
          <p className="text-neutral-400 mb-8">
            Join creators who finally understand why their content performs — and how to make it better.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="bg-violet-600 text-white hover:bg-violet-500">
                Get started free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <span className="text-sm text-neutral-500">
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
