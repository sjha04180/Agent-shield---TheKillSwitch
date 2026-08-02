"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // Wait, in case hook form resolver is not installed, we can validate using simple zod parse, which is safer and dependency-free! Let's just use manual validation with Zod to avoid hook-form resolver dependency errors.

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#050816] text-white">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (
        errorParam === "OAuthSignin" ||
        errorParam === "OAuthCallback" ||
        errorParam === "Callback" ||
        errorParam === "Configuration"
      ) {
        setError(
          "Google Sign-In is currently unavailable or failed. Please sign in with your email and password instead."
        );
      } else {
        setError("Authentication failed. Please check your details and try again.");
      }
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    // Validate using Zod
    const result = loginSchema.safeParse({ email, password, rememberMe });
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
      const res = await signIn("credentials", {
        redirect: false,
        email: email.toLowerCase(),
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" ? "Invalid email or password." : res.error);
        setLoading(false);
      } else {
        router.refresh();
        router.push(callbackUrl);
      }
    } catch (e: any) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch (e: any) {
      setError("Google Sign-In is currently unavailable. Please sign in with email and password instead.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050816] px-6 py-12 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#2563EB]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 shadow-glow relative z-10">
        {/* Title / Logo */}
        <div className="text-center mb-8">
          <img src="/icon.png" alt="AgentShield Logo" className="inline-flex w-12 h-12 object-contain rounded-xl shadow-glow mb-4" />
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="text-gray-400 text-sm mt-1">Sign in to govern your AI Agents</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/40 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="name@organization.com"
            />
            {validationErrors.email && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.email}</span>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <Link href="/forgot-password" className="text-xs text-[#2563EB] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="••••••••••••"
            />
            {validationErrors.password && (
              <span className="text-xs text-red-500 mt-1 block">{validationErrors.password}</span>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-[#050816] border-[#1f2937] text-[#2563EB] focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 select-none">
              Remember me on this device
            </label>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition shadow-glow flex items-center justify-center disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-[#1f2937]"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-wider">Or</span>
          <div className="flex-grow border-t border-[#1f2937]"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3 rounded-xl bg-[#050816] hover:bg-[#050816]/75 border border-[#1f2937] text-gray-300 font-medium transition flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" fill="#EA4335"/>
          </svg>
          Sign In with Google
        </button>

        {/* Register Redirect */}
        <div className="text-center mt-6 text-sm text-gray-400">
          Don't have an account?{" "}
          <Link href="/register" className="text-[#2563EB] hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
