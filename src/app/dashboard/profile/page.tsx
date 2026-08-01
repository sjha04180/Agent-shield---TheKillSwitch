"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  organization: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  image: z.string().url("Invalid image URL").or(z.string().length(0)),
});

export default function ProfilePage() {
  const { user, updateProfile, loading, fetchProfile } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [image, setImage] = useState("");

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setOrganization(user.organization || "");
      setTimezone(user.timezone || "UTC");
      setImage(user.image || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSaving(true);

    const parsed = profileSchema.safeParse({ name, organization, timezone, image });
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message || "Invalid input parameters");
      setIsSaving(false);
      return;
    }

    const success = await updateProfile({ name, organization, timezone, image });
    setIsSaving(false);

    if (success) {
      addNotification("Profile Updated", "Your profile details have been updated successfully.", "success");
    } else {
      addNotification("Update Failed", "An error occurred while updating profile.", "error");
    }
  };

  return (
    <div className="max-w-2xl bg-[#101827] border border-[#1f2937]/80 rounded-2xl p-8 shadow-glow font-sans">
      <div className="flex items-center gap-4 border-b border-[#1f2937]/50 pb-6 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#10B981] text-white flex items-center justify-center font-bold text-2xl shadow-glow">
          {user?.name ? user.name[0]?.toUpperCase() : "U"}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{user?.name}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{user?.email}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-[#2563EB]/15 text-[#2563EB]">
            {user?.role} Account
          </span>
        </div>
      </div>

      {validationError && (
        <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/40 text-red-400 text-xs rounded-xl">
          ⚠️ {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="John Doe"
            />
          </div>

          {/* Email (Readonly) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address (Read-only)</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816]/50 border border-[#1f2937] text-gray-500 cursor-not-allowed text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Organization */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Organization</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
              placeholder="Decentralized Agency Inc."
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="EST">EST (Eastern Standard Time)</option>
              <option value="GMT">GMT (Greenwich Mean Time)</option>
              <option value="IST">IST (Indian Standard Time)</option>
              <option value="PST">PST (Pacific Standard Time)</option>
            </select>
          </div>
        </div>

        {/* Profile Photo */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Profile Photo URL</label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#050816] border border-[#1f2937] text-white focus:outline-none focus:border-[#2563EB] transition text-sm font-mono"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-medium transition shadow-glow flex items-center justify-center text-sm min-w-[120px]"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
