// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Custom design system rules
const designSystemPlugin = await import("./eslint-rules/index.js").then(
  (m) => m.default
);

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Ignore patterns first
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      ".pnpm-store/**",
      "eslint-rules/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },

  // Next.js recommended config (without the problematic extends)
  ...compat.config({
    extends: ["next/core-web-vitals"],
  }),

  // Design system rules for all JS/TS files
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@oikion/design-system": designSystemPlugin,
    },
    rules: {
      "@oikion/design-system/no-hardcoded-colors": "warn",
      "@oikion/design-system/no-deprecated-toast": "warn",
      "@oikion/design-system/prefer-semantic-colors": "off",
      "@oikion/design-system/prefer-semantic-typography": "off",
    },
  },

  // Disable hardcoded colors rule for email templates and exports
  {
    files: ["emails/**/*.tsx", "lib/export/**/*.tsx"],
    rules: {
      "@oikion/design-system/no-hardcoded-colors": "off",
    },
  },
];

export default config;
