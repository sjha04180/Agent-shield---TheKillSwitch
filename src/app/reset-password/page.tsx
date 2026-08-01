"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errs[err.path[0] as string] = err.message;
        }
      });
      setErrors(errs);
      setLoading(false);
      return;
    }

    // Mock API Reset
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050816] px-6 py-12 relative overflow-hidden font-sans">
      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 shadow-glow relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Create New Password</h2>
          <p className="text-gray-400 text-sm mt-1">Set a secure password for your governance account</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
            <span>✅</span>
            <span>Password reset success! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="••••••••••••"
            />
            {errors.password && (
              <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="••••••••••••"
            />
            {errors.confirmPassword && (
              <span className="text-xs text-red-500 mt-1 block">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition shadow-glow flex items-center justify-center disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
