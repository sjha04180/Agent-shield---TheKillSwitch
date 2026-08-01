"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationError(null);

    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message || "Invalid input");
      setLoading(false);
      return;
    }

    // Mock API reset call
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050816] px-6 py-12 relative overflow-hidden font-sans">
      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 shadow-glow relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Reset Password</h2>
          <p className="text-gray-400 text-sm mt-1">We'll send you reset guidelines</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl">
              ✉️
            </div>
            <h3 className="text-white font-semibold mb-2">Check your email</h3>
            <p className="text-gray-400 text-sm mb-6">
              We have sent a link to reset your password to <strong>{email}</strong>.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-glow"
            >
              Back to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
                placeholder="name@organization.com"
              />
              {validationError && (
                <span className="text-xs text-red-500 mt-1 block">{validationError}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition shadow-glow flex items-center justify-center disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </button>
            
            <div className="text-center text-sm text-gray-400 mt-4">
              <a href="/login" className="text-[#2563EB] hover:underline font-medium">
                Back to Sign In
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
