"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["owner", "admin"]),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms & conditions" })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<'owner' | 'admin'>("owner");
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    const result = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
      role,
      acceptTerms
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error?.message || "Registration failed. Try again.");
        setLoading(false);
      }
    } catch (e) {
      setError("Failed to reach server. Check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050816] px-6 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 shadow-glow relative z-10">
        <div className="text-center mb-8">
          <img src="/icon.png" alt="AgentShield Logo" className="inline-flex w-12 h-12 object-contain rounded-xl shadow-glow mb-4" />
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1">Start securing your decentralized agency</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/40 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
            <span>✅</span>
            <span>Success! Redirecting you to login...</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="John Doe"
            />
            {validationErrors.name && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.name}</span>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="name@organization.com"
            />
            {validationErrors.email && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.email}</span>
            )}
          </div>

          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("owner")}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                  role === "owner"
                    ? "bg-[#2563EB]/15 border-[#2563EB] text-[#2563EB]"
                    : "bg-[#050816] border-[#1f2937] text-gray-400 hover:text-white"
                }`}
              >
                💼 Wallet Owner
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                  role === "admin"
                    ? "bg-[#2563EB]/15 border-[#2563EB] text-[#2563EB]"
                    : "bg-[#050816] border-[#1f2937] text-gray-400 hover:text-white"
                }`}
              >
                🛡️ Administrator
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="••••••••••••"
            />
            {validationErrors.password && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.password}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="••••••••••••"
            />
            {validationErrors.confirmPassword && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.confirmPassword}</span>
            )}
          </div>

          {/* Terms Acceptance */}
          <div className="flex items-start mt-2">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded bg-[#050816] border-[#1f2937] text-[#2563EB]"
            />
            <label htmlFor="acceptTerms" className="ml-2 text-xs text-gray-400">
              I agree to the AgentShield{" "}
              <a href="#" className="text-[#2563EB] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#2563EB] hover:underline">
                Security Disclosure Agreement
              </a>
            </label>
          </div>
          {validationErrors.acceptTerms && (
            <span className="text-xs text-red-500 mt-1 block">{validationErrors.acceptTerms}</span>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition shadow-glow flex items-center justify-center disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#2563EB] hover:underline font-medium">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
