import React from 'react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 text-center shadow-glow-danger relative z-10">
        <span className="text-5xl block mb-4">⛔</span>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 text-sm mb-8">
          You do not have the required role authorizations to access this administrative console view.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-glow"
        >
          Return to Console
        </Link>
      </div>
    </div>
  );
}
