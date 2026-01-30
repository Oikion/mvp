/**
 * @fileoverview Encourage semantic typography classes
 * @description Suggests using semantic typography scale (text-h1, text-body, etc.)
 *
 * The design system defines a typography scale:
 * - text-h1: 3rem/48px - Main page headings
 * - text-h2: 2.25rem/36px - Section headings
 * - text-h3: 1.875rem/30px - Subsection headings
 * - text-h4: 1.5rem/24px - Card/component headings
 * - text-body: 1rem/16px - Body text
 * - text-caption: 0.875rem/14px - Small text, labels
 *
 * This rule provides suggestions when it detects heading-like elements
 * that could benefit from semantic typography classes.
 */

// Standard Tailwind text sizes that should suggest semantic alternatives
const SIZE_TO_SEMANTIC = {
  // Large sizes -> headings
  "text-5xl": "text-h1",
  "text-4xl": "text-h1 or text-h2",
  "text-3xl": "text-h2 or text-h3",
  "text-2xl": "text-h3 or text-h4",
  "text-xl": "text-h4",
  // Base sizes -> body/caption
  "text-base": "text-body",
  "text-sm": "text-caption or text-body",
  "text-xs": "text-caption",
};

// Heading elements that benefit most from semantic typography
const HEADING_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6"];

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Encourage semantic typography classes from design system",
      category: "Design System",
      recommended: false,
      url: "https://github.com/oikion/mvp/blob/main/docs/design-system/typography.md",
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          enforceOnHeadings: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferSemantic:
        'Consider using semantic typography "{{semantic}}" instead of "{{current}}" for better design system consistency.',
      headingNeedsTypography:
        'Heading element <{{element}}> should use semantic typography (e.g., text-h{{level}}).',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const enforceOnHeadings = options.enforceOnHeadings !== false;

    return {
      JSXElement(node) {
        // Check for heading elements
        const elementName = node.openingElement?.name?.name;
        if (!elementName) return;

        // Find className attribute
        const classAttr = node.openingElement?.attributes?.find(
          (attr) =>
            attr.type === "JSXAttribute" && attr.name?.name === "className"
        );

        let className = "";
        if (classAttr?.value?.type === "Literal") {
          className = classAttr.value.value || "";
        }

        // Check for heading elements without semantic typography
        if (enforceOnHeadings && HEADING_ELEMENTS.includes(elementName)) {
          const hasSemanticTypo = /text-h[1-4]|text-body|text-caption/.test(
            className
          );
          const level = elementName.charAt(1);

          if (!hasSemanticTypo) {
            // Check if it has any size class at all
            const hasSizeClass = /text-(xs|sm|base|lg|xl|[2-6]xl)/.test(
              className
            );

            if (hasSizeClass) {
              context.report({
                node: classAttr || node.openingElement,
                messageId: "preferSemantic",
                data: {
                  current: className.match(
                    /text-(xs|sm|base|lg|xl|[2-6]xl)/
                  )?.[0],
                  semantic: `text-h${Math.min(parseInt(level), 4)}`,
                },
              });
            }
          }
        }

        // Check for non-heading elements with large text that could use semantic scale
        if (!HEADING_ELEMENTS.includes(elementName)) {
          for (const [sizeClass, semantic] of Object.entries(SIZE_TO_SEMANTIC)) {
            if (className.includes(sizeClass)) {
              // Check if semantic class is already used
              const hasSemanticTypo = /text-h[1-4]|text-body|text-caption/.test(
                className
              );
              if (!hasSemanticTypo) {
                // Only report for larger sizes that are clearly heading-like
                if (["text-5xl", "text-4xl", "text-3xl", "text-2xl"].includes(sizeClass)) {
                  context.report({
                    node: classAttr || node.openingElement,
                    messageId: "preferSemantic",
                    data: {
                      current: sizeClass,
                      semantic,
                    },
                  });
                }
              }
            }
          }
        }
      },
    };
  },
};
