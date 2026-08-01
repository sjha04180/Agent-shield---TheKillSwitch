import React from 'react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-6 py-12 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#EF4444]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 text-center shadow-glow relative z-10">
        <span className="text-5xl block mb-4">🔍</span>
        <h2 className="text-3xl font-extrabold text-white mb-2 font-mono">404</h2>
        <h3 className="text-lg font-bold text-white mb-3">Resource Not Found</h3>
        <p className="text-gray-400 text-sm mb-8">
          The dashboard route you requested does not exist or has been archived by the policy governance module.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-glow"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
