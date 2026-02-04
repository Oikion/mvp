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

  // Disable for intentional color palettes and decorative colors
  {
    files: [
      // Changelog uses a user-selectable color palette (intentionally arbitrary)
      "lib/changelog/**/*.ts",
      "**/changelog/components/**/*.tsx",
      // Website landing page uses decorative brand colors
      "components/website/**/*.tsx",
      // Navigation uses brand colors for module differentiation
      "config/navigation.tsx",
      // Badge component has intentional variant colors
      "components/ui/badge.tsx",
      // Feed page uses categorical colors for event types
      "**/feed/components/**/*.tsx",
      // Profile pages use decorative colors for visual variety
      "**/profile/**/components/**/*.tsx",
      "**/agent/**/components/**/*.tsx",
      // Documents use color coding for entity types
      "**/documents/components/**/*.tsx",
      "**/documents/templates/**/*.tsx",
      // Deals use categorical colors for deal stages
      "**/deals/**/components/**/*.tsx",
      // Onboarding uses brand colors
      "**/onboarding/**/*.tsx",
      // Feedback components use categorical colors
      "**/feedback/**/*.tsx",
      // Matchmaking uses color coding
      "**/matchmaking/**/*.tsx",
      // Messages use brand colors
      "**/messages/**/*.tsx",
      // Modals with specific branding
      "components/modals/**/*.tsx",
    ],
    rules: {
      "@oikion/design-system/no-hardcoded-colors": "off",
    },
  },
];

export default config;
