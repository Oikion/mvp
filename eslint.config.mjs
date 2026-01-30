// @ts-check
/**
 * ESLint Flat Config for Oikion
 * 
 * Uses design system rules + TypeScript/React parsing.
 * Next.js linting is handled separately via `next lint` when available.
 */
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

// Custom design system rules
const designSystemPlugin = await import("./eslint-rules/index.js").then(
  (m) => m.default
);

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Ignore patterns
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

  // TypeScript files configuration
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@oikion/design-system": designSystemPlugin,
    },
    rules: {
      // Design system rules
      "@oikion/design-system/no-hardcoded-colors": "warn",
      "@oikion/design-system/no-deprecated-toast": "warn",
      "@oikion/design-system/no-deprecated-components": "warn",
      "@oikion/design-system/prefer-semantic-colors": "off",
      "@oikion/design-system/prefer-semantic-typography": "off",
    },
  },

  // JavaScript files configuration
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      "@oikion/design-system": designSystemPlugin,
    },
    rules: {
      "@oikion/design-system/no-hardcoded-colors": "warn",
      "@oikion/design-system/no-deprecated-toast": "warn",
      "@oikion/design-system/no-deprecated-components": "warn",
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
