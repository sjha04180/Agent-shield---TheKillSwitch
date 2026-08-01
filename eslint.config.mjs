import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // console.error/warn is acceptable in Next.js API route handlers (server runtime)
      "no-console": "off",
      // Enforce no unused variables strictly
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow empty catch blocks (used intentionally in audit service)
      "@typescript-eslint/no-empty-object-type": "off",
      // Relax some strict rules for pragmatic hackathon code
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
