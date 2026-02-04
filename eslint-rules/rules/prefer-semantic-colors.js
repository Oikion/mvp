/**
 * @fileoverview Encourage semantic color tokens over generic ones
 * @description Promotes usage of design system semantic colors
 *
 * This rule provides suggestions (not errors) for using semantic colors
 * where they make sense based on context.
 */

// Context keywords that suggest a semantic color should be used
const SEMANTIC_CONTEXTS = {
  error: ["error", "invalid", "fail", "wrong", "danger"],
  success: ["success", "valid", "correct", "done", "complete", "created"],
  warning: ["warning", "warn", "caution", "alert"],
  info: ["info", "information", "note", "notice"],
  destructive: [
    "delete",
    "remove",
    "cancel",
    "destroy",
    "trash",
    "discard",
  ],
  primary: ["primary", "main", "action", "submit", "save", "confirm"],
};

// Map context to recommended color token
const CONTEXT_TO_COLOR = {
  error: "destructive",
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
  primary: "primary",
};

/**
 * Check if a string contains any context keywords
 */
function findSemanticContext(text) {
  const lowerText = text.toLowerCase();
  for (const [context, keywords] of Object.entries(SEMANTIC_CONTEXTS)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return context;
    }
  }
  return null;
}

/**
 * Check if className already uses semantic colors
 */
function usesSemanticColors(className) {
  const semanticTokens = [
    "destructive",
    "success",
    "warning",
    "info",
    "primary",
    "secondary",
    "muted",
    "accent",
  ];
  return semanticTokens.some((token) => className.includes(token));
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Encourage semantic color tokens based on context",
      category: "Design System",
      recommended: false,
      url: "https://github.com/oikion/mvp/blob/main/docs/design-system/colors.md",
    },
    fixable: null,
    schema: [],
    messages: {
      preferSemantic:
        'Consider using semantic color "{{semantic}}" for {{context}}-related elements instead of hardcoded colors.',
    },
  },
  create(context) {
    /**
     * Analyze a JSX element for semantic color opportunities
     */
    function analyzeElement(node) {
      // Get element name or component name
      let elementName = "";
      if (node.openingElement?.name?.type === "JSXIdentifier") {
        elementName = node.openingElement.name.name;
      }

      // Get className value
      let className = "";
      const classAttr = node.openingElement?.attributes?.find(
        (attr) => attr.type === "JSXAttribute" && attr.name?.name === "className"
      );
      if (classAttr?.value?.type === "Literal") {
        className = classAttr.value.value || "";
      }

      // Get text content for context
      let textContent = "";
      for (const child of node.children || []) {
        if (child.type === "JSXText") {
          textContent += child.value;
        } else if (
          child.type === "JSXExpressionContainer" &&
          child.expression?.type === "Literal"
        ) {
          textContent += child.expression.value;
        }
      }

      // Skip if already using semantic colors
      if (usesSemanticColors(className)) return;

      // Check element name and text content for semantic context
      const contextFromName = findSemanticContext(elementName);
      const contextFromText = findSemanticContext(textContent);
      const detectedContext = contextFromName || contextFromText;

      if (detectedContext && !usesSemanticColors(className)) {
        // Only report if there's a hardcoded color being used
        const hasHardcodedColor =
          /\b(text|bg|border)-(red|blue|green|yellow|orange)-\d{2,3}/.test(
            className
          );

        if (hasHardcodedColor) {
          context.report({
            node: classAttr || node,
            messageId: "preferSemantic",
            data: {
              semantic: CONTEXT_TO_COLOR[detectedContext],
              context: detectedContext,
            },
          });
        }
      }
    }

    return {
      JSXElement(node) {
        analyzeElement(node);
      },
    };
  },
};
