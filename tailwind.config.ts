import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050816",
        card: "#101827",
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#10B981",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#101827",
        },
        muted: {
          DEFAULT: "#6B7280",
          foreground: "#9CA3AF",
        },
        border: "#1F2937",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(37, 99, 235, 0.15)",
        "glow-danger": "0 0 20px rgba(239, 68, 68, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
