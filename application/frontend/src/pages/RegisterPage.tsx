import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiError } from "../api";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { Alert } from "../components/common/Alert";
import { Lock, Mail, User, Layers, Check, X } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation rules
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet the complexity requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate("/");
    } catch (err) {
      setError(formatApiError(err, "Registration failed. Please verify your details."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
          <p className="text-xs text-slate-500 mt-1">
            Join DeployStack to manage workspaces and Kanban task boards
          </p>
        </div>

        {error && (
          <div className="mb-5">
            <Alert type="error" message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            leftIcon={<User className="w-4 h-4" />}
            maxLength={100}
          />

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
            placeholder="Min. 8 chars, uppercase, lowercase, number, symbol"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {/* Password complexity checklist */}
          {password.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <p className="font-semibold text-slate-600 mb-1">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-1 text-slate-500">
                <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600" : ""}`}>
                  {hasMinLength ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                  At least 8 characters
                </span>
                <span className={`flex items-center gap-1 ${hasUpper ? "text-emerald-600" : ""}`}>
                  {hasUpper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                  1 Uppercase letter
                </span>
                <span className={`flex items-center gap-1 ${hasLower ? "text-emerald-600" : ""}`}>
                  {hasLower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                  1 Lowercase letter
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-600" : ""}`}>
                  {hasNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                  1 Number
                </span>
                <span className={`flex items-center gap-1 ${hasSpecial ? "text-emerald-600" : ""}`}>
                  {hasSpecial ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                  1 Special symbol
                </span>
              </div>
            </div>
          )}

          <Input
            label="Confirm Password"
            required
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            leftIcon={<Lock className="w-4 h-4" />}
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords do not match"
                : undefined
            }
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="md"
            isLoading={isLoading}
            disabled={!isPasswordValid || !passwordsMatch}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Sign in to existing account
          </Link>
        </div>
      </div>
    </div>
  );
};
