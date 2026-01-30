/**
 * @fileoverview Prevent imports from deprecated UI components
 * @description Enforces migration to standardized components
 */

// Map of deprecated imports to their replacements
const DEPRECATED_IMPORTS = {
  // Loading components
  "@/components/ui/loading-state": {
    message: 'LoadingState is deprecated. Use Loading from "@/components/ui/loading" instead.',
    suggestion: 'import { Loading } from "@/components/ui/loading";',
  },
  "@/components/ui/spinner": {
    message: 'Spinner is deprecated. Use Loading with variant="spinner" from "@/components/ui/loading" instead.',
    suggestion: 'import { Loading } from "@/components/ui/loading";',
  },
  // Modal components (these were deleted, but add rule in case old branches exist)
  "@/components/ui/modal": {
    message: 'Modal is deprecated. Use Dialog from "@/components/ui/dialog" or ConfirmationDialog instead.',
    suggestion: 'import { Dialog, DialogContent } from "@/components/ui/dialog";',
  },
  "@/components/modals/alert-modal": {
    message: 'AlertModal is deprecated. Use ConfirmationDialog from "@/components/ui/confirmation-dialog" instead.',
    suggestion: 'import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";',
  },
  "@/components/modals/right-view-modal": {
    message: 'RightViewModal is deprecated. Use Sheet from "@/components/ui/sheet" instead.',
    suggestion: 'import { Sheet, SheetContent } from "@/components/ui/sheet";',
  },
  "@/components/modals/right-view-notrigger": {
    message: 'RightViewModalNoTrigger is deprecated. Use Sheet from "@/components/ui/sheet" instead.',
    suggestion: 'import { Sheet, SheetContent } from "@/components/ui/sheet";',
  },
  // Store
  "@/store/use-alert-modal": {
    message: 'useAlertModal store is deprecated and unused. Use useConfirmation from ConfirmationDialog instead.',
    suggestion: 'import { useConfirmation } from "@/components/ui/confirmation-dialog";',
  },
  // Hooks
  "@/hooks/use-delete-confirmation": {
    message: 'useDeleteConfirmation is deprecated. Use useConfirmation from "@/components/ui/confirmation-dialog" instead.',
    suggestion: 'import { useConfirmation } from "@/components/ui/confirmation-dialog";',
  },
};

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prevent imports from deprecated UI components",
      category: "Design System",
      recommended: true,
    },
    fixable: null, // Can't auto-fix as it requires code changes
    schema: [],
    messages: {
      deprecatedComponent: "{{message}}\n\nSuggested replacement:\n{{suggestion}}",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // Check if this import path matches any deprecated component
        for (const [deprecatedPath, { message, suggestion }] of Object.entries(DEPRECATED_IMPORTS)) {
          if (
            source === deprecatedPath ||
            source === deprecatedPath.replace("@/", "") ||
            source.endsWith(deprecatedPath.split("/").pop())
          ) {
            context.report({
              node,
              messageId: "deprecatedComponent",
              data: { message, suggestion },
            });
            break;
          }
        }
      },
    };
  },
};
