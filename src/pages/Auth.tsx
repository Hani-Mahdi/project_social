import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { resetPassword } from "@/lib/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithProvider, loading } = useAuth();
  
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "forgot") {
      const result = await resetPassword(formData.email);
      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage("Check your email for a password reset link");
      }
      return;
    }

    if (mode === "login") {
      const result = await signIn(formData.email, formData.password);
      if (result.error) {
        setError(result.error.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      if (result.error) {
        setError(result.error.message);
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleProviderSignIn = async (provider: "google" | "github") => {
    setError(null);
    const result = await signInWithProvider(provider);
    if (result.error) {
      setError(result.error.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 flex-col justify-between p-12">
        <div>
          <Link to="/" className="text-sm text-violet-400 hover:text-violet-300 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all">
            ← Back to home
          </Link>
        </div>
        
        <div>
          <h1 className="text-3xl font-semibold text-white mb-3">
            GrowthCopilot
          </h1>
          <p className="text-neutral-400 leading-relaxed max-w-sm">
            Know what works before you post. Get instant AI feedback on your videos.
          </p>
        </div>
        
        <div className="space-y-0">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-medium">
                1
              </div>
              <div className="w-px h-8 bg-neutral-700" />
            </div>
            <div className="pb-8">
              <p className="text-white font-medium">Upload your content</p>
              <p className="text-neutral-500 text-sm">Drop your video and get started</p>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 text-sm font-medium">
                2
              </div>
              <div className="w-px h-8 bg-neutral-700" />
            </div>
            <div className="pb-8">
              <p className="text-neutral-300 font-medium">Get AI feedback</p>
              <p className="text-neutral-500 text-sm">Understand what's working</p>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 text-sm font-medium">
                3
              </div>
            </div>
            <div>
              <p className="text-neutral-300 font-medium">Improve and grow</p>
              <p className="text-neutral-500 text-sm">Apply insights to your content</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile back link */}
          <Link to="/" className="lg:hidden text-sm text-violet-400 hover:text-violet-300 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all mb-8 block">
            ← Back to home
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white mb-3">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
            </h2>
            <p className="text-neutral-500 text-base">
              {mode === "login"
                ? "Enter your credentials to continue"
                : mode === "signup"
                ? "Enter your details to get started"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          {/* Mode toggle */}
          {mode !== "forgot" && (
            <div className="flex mb-8 border-b border-neutral-800">
              <button
                onClick={() => setMode("login")}
                className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                  mode === "login"
                    ? "text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Log in
                {mode === "login" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`pb-3 px-1 ml-6 text-sm font-medium transition-colors relative ${
                  mode === "signup"
                    ? "text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Sign up
                {mode === "signup" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <button
              onClick={() => setMode("login")}
              className="mb-6 text-sm text-neutral-500 hover:text-white transition-colors"
            >
              ← Back to login
            </button>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {message}
            </div>
          )}

          {/* Social login */}
          {mode !== "forgot" && (
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleProviderSignIn("google")}
              disabled={loading}
              className="w-full bg-transparent border-neutral-800 text-white hover:bg-neutral-900 hover:text-white h-11"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleProviderSignIn("github")}
              disabled={loading}
              className="w-full bg-transparent border-neutral-800 text-white hover:bg-neutral-900 hover:text-white h-11"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </Button>
          </div>
          )}

          {/* Divider */}
          {mode !== "forgot" && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-neutral-950 text-neutral-600">or</span>
            </div>
          </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-neutral-400 text-sm">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="bg-transparent border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-neutral-400 text-sm">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="bg-transparent border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-11"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-400 text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-transparent border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-11"
              />
            </div>

            {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-400 text-sm">
                  Password
                </Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-neutral-500 hover:text-white transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-transparent border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white h-10 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          {/* Terms */}
          {mode === "signup" && (
            <p className="mt-6 text-xs text-center text-neutral-600">
              By continuing, you agree to our{" "}
              <a href="#" className="text-neutral-400 hover:text-white">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-neutral-400 hover:text-white">
                Privacy Policy
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
