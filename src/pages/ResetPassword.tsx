import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link to="/auth" className="text-sm text-violet-400 hover:text-violet-300 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all mb-8 block">
          ← Back to login
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Set new password
          </h2>
          <p className="text-neutral-500 text-sm">
            Enter your new password below
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            Password updated successfully! Redirecting to login...
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-400 text-sm">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-400 text-sm">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-600 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white h-10 font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
