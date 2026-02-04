"use client";

import * as React from "react";
import { Loader2, AlertTriangle, Trash2, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * ConfirmationDialog - Standardized confirmation dialog for destructive actions
 *
 * Provides consistent confirmation UX across the application with:
 * - Loading states
 * - Optional type-to-confirm for high-risk actions
 * - Customizable messaging
 * - Proper accessibility
 *
 * @example
 * ```tsx
 * // Simple delete confirmation
 * <ConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Property"
 *   description="This action cannot be undone."
 *   entityName="123 Main Street"
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 * />
 *
 * // With type-to-confirm
 * <ConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Account"
 *   description="All data will be permanently deleted."
 *   confirmText="DELETE"
 *   variant="danger"
 *   onConfirm={handleDeleteAccount}
 * />
 * ```
 */

export type ConfirmationVariant = "default" | "danger" | "warning";

export interface ConfirmationDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Dialog title
   */
  title: string;
  /**
   * Dialog description
   */
  description?: string;
  /**
   * Entity name to display (e.g., "123 Main Street")
   */
  entityName?: string | null;
  /**
   * Callback when confirmed
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Whether confirmation is in progress
   */
  isLoading?: boolean;
  /**
   * Variant affecting styling
   */
  variant?: ConfirmationVariant;
  /**
   * Text user must type to confirm (for high-risk actions)
   */
  confirmText?: string;
  /**
   * Cancel button label
   */
  cancelLabel?: string;
  /**
   * Confirm button label
   */
  confirmLabel?: string;
  /**
   * Loading state label
   */
  loadingLabel?: string;
  /**
   * Custom icon for the dialog
   */
  icon?: LucideIcon;
}

const variantConfig: Record<
  ConfirmationVariant,
  { icon: LucideIcon; iconClass: string; buttonClass: string }
> = {
  default: {
    icon: AlertTriangle,
    iconClass: "text-muted-foreground",
    buttonClass: "",
  },
  danger: {
    icon: Trash2,
    iconClass: "text-destructive",
    buttonClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    buttonClass: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  entityName,
  onConfirm,
  isLoading = false,
  variant = "danger",
  confirmText,
  cancelLabel = "Cancel",
  confirmLabel = "Delete",
  loadingLabel = "Loading...",
  icon: IconOverride,
}: Readonly<ConfirmationDialogProps>) {
  const [inputValue, setInputValue] = React.useState("");
  const config = variantConfig[variant];
  const Icon = IconOverride ?? config.icon;

  // Require typing confirmation text if provided
  const requiresTextConfirm = !!confirmText;
  const isTextConfirmed = !requiresTextConfirm || inputValue === confirmText;

  // Reset input when dialog closes
  React.useEffect(() => {
    if (!open) {
      setInputValue("");
    }
  }, [open]);

  // Prevent closing during loading
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isLoading) return;
      onOpenChange(newOpen);
    },
    [isLoading, onOpenChange]
  );

  const handleConfirm = React.useCallback(async () => {
    if (!isTextConfirmed) return;
    await onConfirm();
  }, [isTextConfirmed, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                variant === "danger" && "bg-destructive/10",
                variant === "warning" && "bg-warning/10",
                variant === "default" && "bg-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", config.iconClass)} />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {description}
                {entityName && (
                  <span className="block mt-2 font-medium text-foreground">
                    &quot;{entityName}&quot;
                  </span>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {requiresTextConfirm && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <span className="font-mono font-bold">{confirmText}</span> to
              confirm:
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !isTextConfirmed}
            className={cn(config.buttonClass)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * useConfirmation - Hook for managing confirmation dialog state
 *
 * @example
 * ```tsx
 * const { isOpen, isLoading, confirm, cancel, execute } = useConfirmation();
 *
 * const handleDelete = () => {
 *   execute(async () => {
 *     await deleteItem(id);
 *     toast.success("Deleted");
 *   });
 * };
 *
 * <Button onClick={confirm}>Delete</Button>
 * <ConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={(open) => !open && cancel()}
 *   onConfirm={handleDelete}
 *   isLoading={isLoading}
 *   ...
 * />
 * ```
 */
export function useConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const actionRef = React.useRef<(() => Promise<void>) | null>(null);

  const confirm = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const cancel = React.useCallback(() => {
    if (!isLoading) {
      setIsOpen(false);
      actionRef.current = null;
    }
  }, [isLoading]);

  const execute = React.useCallback(
    async (action: () => Promise<void>) => {
      setIsLoading(true);
      try {
        await action();
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const confirmAndExecute = React.useCallback(
    (action: () => Promise<void>) => {
      actionRef.current = action;
      setIsOpen(true);
    },
    []
  );

  const handleConfirm = React.useCallback(async () => {
    if (actionRef.current) {
      await execute(actionRef.current);
      actionRef.current = null;
    }
  }, [execute]);

  return {
    isOpen,
    isLoading,
    confirm,
    cancel,
    execute,
    confirmAndExecute,
    handleConfirm,
    setIsOpen,
  };
}
