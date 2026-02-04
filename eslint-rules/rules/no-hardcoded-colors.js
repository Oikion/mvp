/**
 * @fileoverview Prevent hardcoded Tailwind color classes
 * @description Encourages use of semantic color tokens instead of direct color values
 *
 * Bad:  className="text-destructive bg-primary"
 * Good: className="text-destructive bg-primary"
 */

// Tailwind color classes to detect
const HARDCODED_COLOR_PATTERNS = [
  // Text colors
  /\btext-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|emerald|violet|fuchsia|lime|amber|rose|sky|stone|neutral|zinc|gray|slate)-\d{2,3}/,
  // Background colors
  /\bbg-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|emerald|violet|fuchsia|lime|amber|rose|sky|stone|neutral|zinc|gray|slate)-\d{2,3}/,
  // Border colors
  /\bborder-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|emerald|violet|fuchsia|lime|amber|rose|sky|stone|neutral|zinc|gray|slate)-\d{2,3}/,
  // Ring colors
  /\bring-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|emerald|violet|fuchsia|lime|amber|rose|sky|stone|neutral|zinc|gray|slate)-\d{2,3}/,
];

// Map of hardcoded colors to semantic alternatives
const COLOR_SUGGESTIONS = {
  "red-500": "destructive",
  "red-600": "destructive",
  "red-50": "destructive/10",
  "green-500": "success",
  "green-600": "success",
  "green-50": "success/10",
  "blue-500": "primary or info",
  "blue-600": "primary or info",
  "blue-50": "primary/10 or info/10",
  "yellow-500": "warning",
  "yellow-600": "warning",
  "yellow-50": "warning/10",
  "orange-500": "warning",
  "orange-600": "warning",
  "rose-500": "destructive",
  "rose-600": "destructive",
};

/**
 * Find hardcoded colors in a string
 */
function findHardcodedColors(value) {
  const matches = [];
  for (const pattern of HARDCODED_COLOR_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Get suggestion for a hardcoded color
 */
function getSuggestion(colorClass) {
  // Extract the color-number part
  const colorMatch = colorClass.match(
    /(red|blue|green|yellow|orange|pink|purple|rose)-\d{2,3}/
  );
  if (colorMatch && COLOR_SUGGESTIONS[colorMatch[0]]) {
    return COLOR_SUGGESTIONS[colorMatch[0]];
  }
  return "a semantic color token (e.g., destructive, success, primary, warning)";
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prevent hardcoded Tailwind color classes in favor of semantic tokens",
      category: "Design System",
      recommended: true,
      url: "https://github.com/oikion/mvp/blob/main/docs/design-system/colors.md",
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          allowInTests: {
            type: "boolean",
            default: true,
          },
          ignore: {
            type: "array",
            items: { type: "string" },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedColor:
        'Avoid hardcoded color "{{color}}". Use semantic tokens like {{suggestion}} instead.',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const allowInTests = options.allowInTests !== false;
    const ignore = options.ignore || [];

    // Skip test files if allowed
    const filename = context.getFilename();
    if (
      allowInTests &&
      (filename.includes(".test.") ||
        filename.includes(".spec.") ||
        filename.includes("__tests__"))
    ) {
      return {};
    }

    return {
      // Check JSX attributes (className)
      JSXAttribute(node) {
        if (node.name.name !== "className") return;

        let value = "";
        if (node.value?.type === "Literal") {
          value = node.value.value;
        } else if (
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression?.type === "Literal"
        ) {
          value = node.value.expression.value;
        } else if (
          node.value?.type === "JSXExpressionContainer" &&
          node.value.expression?.type === "TemplateLiteral"
        ) {
          value = node.value.expression.quasis
            .map((q) => q.value.raw)
            .join(" ");
        }

        if (typeof value !== "string") return;

        // Check for ignored patterns
        if (ignore.some((pattern) => value.includes(pattern))) return;

        const hardcodedColors = findHardcodedColors(value);
        for (const color of hardcodedColors) {
          context.report({
            node,
            messageId: "hardcodedColor",
            data: {
              color,
              suggestion: getSuggestion(color),
            },
          });
        }
      },

      // Check cn() and clsx() calls
      CallExpression(node) {
        const calleeName = node.callee.name;
        if (calleeName !== "cn" && calleeName !== "clsx") return;

        for (const arg of node.arguments) {
          let value = "";
          if (arg.type === "Literal" && typeof arg.value === "string") {
            value = arg.value;
          } else if (arg.type === "TemplateLiteral") {
            value = arg.quasis.map((q) => q.value.raw).join(" ");
          }

          if (!value) continue;

          // Check for ignored patterns
          if (ignore.some((pattern) => value.includes(pattern))) continue;

          const hardcodedColors = findHardcodedColors(value);
          for (const color of hardcodedColors) {
            context.report({
              node: arg,
              messageId: "hardcodedColor",
              data: {
                color,
                suggestion: getSuggestion(color),
              },
            });
          }
        }
      },
    };
  },
};
