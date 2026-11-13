import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../api";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { Lock, Mail, Layers } from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine redirection destination
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatApiError(err, "Invalid email or password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to DeployStack</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your projects, team members, and Kanban boards
          </p>
        </div>

        {error && (
          <div className="mb-5">
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button type="submit" className="w-full mt-2" size="md" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
