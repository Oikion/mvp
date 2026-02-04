/**
 * @fileoverview Prevent imports from deprecated toast hook
 * @description Enforces migration from useToast to useAppToast
 *
 * Bad:  import { useAppToast } from "@/hooks/use-app-toast";
 * Good: import { useAppToast } from "@/hooks/use-app-toast"
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent imports from deprecated toast hook",
      category: "Design System",
      recommended: true,
      url: "https://github.com/oikion/mvp/blob/main/docs/design-system/feedback.md",
    },
    fixable: "code",
    schema: [],
    messages: {
      deprecatedToast:
        'The useToast hook from "@/components/ui/use-toast" is deprecated. Use useAppToast from "@/hooks/use-app-toast" instead.',
      deprecatedToastImport:
        'Import "{{importName}}" from deprecated toast module. Use useAppToast from "@/hooks/use-app-toast" instead.',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check for deprecated toast imports
        if (
          source === "@/components/ui/use-toast" ||
          source === "components/ui/use-toast" ||
          source.endsWith("/use-toast") ||
          source.endsWith("/use-toast.ts")
        ) {
          // Get the imported names
          const importedNames = node.specifiers
            .filter((s) => s.type === "ImportSpecifier")
            .map((s) => s.imported.name);

          // Only flag if importing useToast
          if (importedNames.includes("useToast") || importedNames.includes("toast")) {
            context.report({
              node,
              messageId: "deprecatedToast",
              fix(fixer) {
                // Auto-fix: replace the import
                if (
                  importedNames.length === 1 &&
                  importedNames[0] === "useToast"
                ) {
                  return fixer.replaceText(
                    node,
                    'import { useAppToast } from "@/hooks/use-app-toast";'
                  );
                }
                // If there are other imports, we can't auto-fix safely
                return null;
              },
            });
          }
        }

        // Also check for react-hot-toast (another deprecated pattern)
        if (source === "react-hot-toast") {
          context.report({
            node,
            messageId: "deprecatedToastImport",
            data: { importName: "react-hot-toast" },
          });
        }
      },
    };
  },
};
