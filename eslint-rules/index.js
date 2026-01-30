/**
 * Oikion Design System ESLint Plugin
 *
 * Custom rules to enforce design system standards:
 * - no-hardcoded-colors: Prevent direct Tailwind color classes
 * - no-deprecated-toast: Prevent imports from deprecated toast hook
 * - no-deprecated-components: Prevent imports from deprecated UI components
 * - prefer-semantic-colors: Encourage semantic color tokens
 * - prefer-semantic-typography: Encourage semantic typography classes
 *
 * @see docs/design-system/forms.md for usage guidelines
 */

const noHardcodedColors = require("./rules/no-hardcoded-colors");
const noDeprecatedToast = require("./rules/no-deprecated-toast");
const noDeprecatedComponents = require("./rules/no-deprecated-components");
const preferSemanticColors = require("./rules/prefer-semantic-colors");
const preferSemanticTypography = require("./rules/prefer-semantic-typography");

module.exports = {
  rules: {
    "no-hardcoded-colors": noHardcodedColors,
    "no-deprecated-toast": noDeprecatedToast,
    "no-deprecated-components": noDeprecatedComponents,
    "prefer-semantic-colors": preferSemanticColors,
    "prefer-semantic-typography": preferSemanticTypography,
  },
  configs: {
    recommended: {
      plugins: ["@oikion/eslint-plugin-design-system"],
      rules: {
        "@oikion/eslint-plugin-design-system/no-hardcoded-colors": "warn",
        "@oikion/eslint-plugin-design-system/no-deprecated-toast": "error",
        "@oikion/eslint-plugin-design-system/no-deprecated-components": "warn",
        "@oikion/eslint-plugin-design-system/prefer-semantic-colors": "warn",
      },
    },
    strict: {
      plugins: ["@oikion/eslint-plugin-design-system"],
      rules: {
        "@oikion/eslint-plugin-design-system/no-hardcoded-colors": "error",
        "@oikion/eslint-plugin-design-system/no-deprecated-toast": "error",
        "@oikion/eslint-plugin-design-system/no-deprecated-components": "error",
        "@oikion/eslint-plugin-design-system/prefer-semantic-colors": "error",
      },
    },
  },
};
