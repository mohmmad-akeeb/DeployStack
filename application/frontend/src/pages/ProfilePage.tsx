import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi, formatApiError } from "../api";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Alert } from "../components/common/Alert";
import {
  User as UserIcon,
  Mail,
  Lock,
  Image as ImageIcon,
  Check,
  X,
  Calendar,
  ShieldCheck,
} from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileError("Full name is required.");
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);
    setIsUpdatingProfile(true);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      setProfileSuccess("Profile updated successfully!");
    } catch (err) {
      setProfileError(formatApiError(err, "Failed to update profile."));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!isPasswordValid) {
      setPasswordError("New password does not meet complexity requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(formatApiError(err, "Failed to change password."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Profile & Security</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account credentials, display profile, and system access
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.full_name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
            {user.is_superuser && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Superuser
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active Account
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1">{user.email}</p>

          <div className="mt-3 flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined: {new Date(user.created_at).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Verified Identity
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Update Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-600" />
            General Information
          </h3>

          {profileError && (
            <Alert type="error" message={profileError} onDismiss={() => setProfileError(null)} />
          )}
          {profileSuccess && (
            <Alert
              type="success"
              message={profileSuccess}
              onDismiss={() => setProfileSuccess(null)}
            />
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              disabled
              value={user.email}
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              helperText="Email cannot be changed directly."
            />

            <Input
              label="Full Name"
              required
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              leftIcon={<UserIcon className="w-4 h-4 text-slate-400" />}
            />

            <Input
              label="Avatar Image URL"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              leftIcon={<ImageIcon className="w-4 h-4 text-slate-400" />}
              helperText="Optional public image link for your avatar."
            />

            <Button
              type="submit"
              size="sm"
              isLoading={isUpdatingProfile}
              className="w-full sm:w-auto"
            >
              Save Profile
            </Button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Change Password
          </h3>

          {passwordError && (
            <Alert type="error" message={passwordError} onDismiss={() => setPasswordError(null)} />
          )}
          {passwordSuccess && (
            <Alert
              type="success"
              message={passwordSuccess}
              onDismiss={() => setPasswordSuccess(null)}
            />
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            <Input
              label="New Password"
              required
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            {newPassword.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <p className="font-semibold text-slate-600 mb-1">New Password Requirements:</p>
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
              label="Confirm New Password"
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              error={
                confirmPassword.length > 0 && !passwordsMatch
                  ? "Passwords do not match"
                  : undefined
              }
            />

            <Button
              type="submit"
              size="sm"
              isLoading={isChangingPassword}
              disabled={!isPasswordValid || !passwordsMatch || !currentPassword}
              className="w-full sm:w-auto"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
