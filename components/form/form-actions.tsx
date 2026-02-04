"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

/**
 * FormActions - Standardized form action buttons container
 *
 * Provides consistent button placement and behavior for forms:
 * - Cancel button on the left (outline style)
 * - Submit button on the right (primary style)
 * - Loading state with spinner
 * - Responsive layout (stacks on mobile if needed)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormActions
 *   onCancel={() => router.back()}
 *   isLoading={isSubmitting}
 * />
 *
 * // With custom labels
 * <FormActions
 *   onCancel={() => setIsEditing(false)}
 *   isLoading={isPending}
 *   submitLabel="Update"
 *   cancelLabel="Discard"
 * />
 *
 * // Without cancel button (e.g., search form)
 * <FormActions
 *   showCancel={false}
 *   submitLabel="Search"
 * />
 *
 * // Destructive action
 * <FormActions
 *   onCancel={() => setOpen(false)}
 *   isLoading={isDeleting}
 *   submitLabel="Delete"
 *   submitVariant="destructive"
 * />
 * ```
 */

export interface FormActionsProps {
  /**
   * Handler for cancel button click
   */
  onCancel?: () => void;
  /**
   * Whether the form is currently submitting
   */
  isLoading?: boolean;
  /**
   * Whether to disable the submit button
   */
  isDisabled?: boolean;
  /**
   * Custom label for submit button. Defaults to translated "Save"
   */
  submitLabel?: string;
  /**
   * Custom label for cancel button. Defaults to translated "Cancel"
   */
  cancelLabel?: string;
  /**
   * Whether to show the cancel button. Default: true
   */
  showCancel?: boolean;
  /**
   * Variant for the submit button. Default: "default"
   */
  submitVariant?: ButtonProps["variant"];
  /**
   * Size for both buttons. Default: "default"
   */
  size?: ButtonProps["size"];
  /**
   * Additional class name for the container
   */
  className?: string;
  /**
   * Alignment of buttons. Default: "end" (right-aligned)
   */
  align?: "start" | "center" | "end" | "between";
  /**
   * Whether the form buttons should be full width on mobile
   */
  fullWidthMobile?: boolean;
  /**
   * Additional content to render before the action buttons (e.g., secondary actions)
   */
  leftContent?: React.ReactNode;
  /**
   * Type for the submit button. Default: "submit"
   */
  submitType?: "submit" | "button";
  /**
   * Handler for submit button click (only needed if submitType is "button")
   */
  onSubmit?: () => void;
}

export function FormActions({
  onCancel,
  isLoading = false,
  isDisabled = false,
  submitLabel,
  cancelLabel,
  showCancel = true,
  submitVariant = "default",
  size = "default",
  className,
  align = "end",
  fullWidthMobile = false,
  leftContent,
  submitType = "submit",
  onSubmit,
}: FormActionsProps) {
  const t = useTranslations("buttons");

  const alignmentClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 pt-4",
        alignmentClasses[align],
        fullWidthMobile && "flex-col sm:flex-row",
        className
      )}
    >
      {leftContent && <div className="flex-1">{leftContent}</div>}

      <div
        className={cn(
          "flex items-center gap-3",
          fullWidthMobile && "w-full sm:w-auto flex-col sm:flex-row"
        )}
      >
        {showCancel && (
          <Button
            type="button"
            variant="outline"
            size={size}
            onClick={onCancel}
            disabled={isLoading}
            className={cn(fullWidthMobile && "w-full sm:w-auto")}
          >
            {cancelLabel ?? t("cancel")}
          </Button>
        )}

        <Button
          type={submitType}
          variant={submitVariant}
          size={size}
          disabled={isLoading || isDisabled}
          onClick={submitType === "button" ? onSubmit : undefined}
          className={cn(fullWidthMobile && "w-full sm:w-auto")}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="sr-only">Loading</span>
            </>
          ) : (
            submitLabel ?? t("save")
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * FormActionsInline - Inline action buttons for edit mode toggles
 *
 * Used for inline editing patterns where save/cancel appear next to the field
 *
 * @example
 * ```tsx
 * {isEditing ? (
 *   <FormActionsInline
 *     onCancel={() => setIsEditing(false)}
 *     isLoading={isSaving}
 *   />
 * ) : (
 *   <Button variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
 * )}
 * ```
 */
export interface FormActionsInlineProps {
  onCancel: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void;
  submitType?: "submit" | "button";
}

export function FormActionsInline({
  onCancel,
  isLoading = false,
  isDisabled = false,
  submitLabel,
  cancelLabel,
  onSubmit,
  submitType = "submit",
}: FormActionsInlineProps) {
  const t = useTranslations("buttons");

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isLoading}
      >
        {cancelLabel ?? t("cancel")}
      </Button>
      <Button
        type={submitType}
        variant="default"
        size="sm"
        disabled={isLoading || isDisabled}
        onClick={submitType === "button" ? onSubmit : undefined}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          submitLabel ?? t("save")
        )}
      </Button>
    </div>
  );
}

/**
 * FormActionsDialog - Action buttons for dialogs/modals
 *
 * Standard layout for dialog footers with proper spacing
 *
 * @example
 * ```tsx
 * <DialogFooter>
 *   <FormActionsDialog
 *     onCancel={() => setOpen(false)}
 *     isLoading={isSubmitting}
 *     submitLabel="Create"
 *   />
 * </DialogFooter>
 * ```
 */
export function FormActionsDialog(props: FormActionsProps) {
  return (
    <FormActions
      {...props}
      className={cn("pt-0", props.className)}
      align="end"
    />
  );
}
