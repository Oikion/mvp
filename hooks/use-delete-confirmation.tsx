"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface UseDeleteConfirmationOptions {
  /** Type of entity being deleted (for display) */
  entityType: string;
  /** Name of the specific entity being deleted */
  entityName: string;
  /** Async function to perform the delete */
  onDelete: () => Promise<void>;
  /** Callback after successful deletion */
  onSuccess?: () => void;
  /** Callback on deletion error */
  onError?: (error: Error) => void;
  /** Custom title for the dialog */
  title?: string;
  /** Custom description for the dialog */
  description?: string;
}

export interface UseDeleteConfirmationReturn {
  /** The AlertDialog component to render */
  DeleteDialog: React.FC;
  /** Function to open the delete confirmation dialog */
  openDeleteDialog: () => void;
  /** Function to close the delete confirmation dialog */
  closeDeleteDialog: () => void;
  /** Whether a delete operation is in progress */
  isDeleting: boolean;
  /** Whether the dialog is currently open */
  isOpen: boolean;
}

/**
 * Hook for standardized delete confirmation dialogs.
 * 
 * Usage:
 * ```tsx
 * const { DeleteDialog, openDeleteDialog, isDeleting } = useDeleteConfirmation({
 *   entityType: "property",
 *   entityName: property.name,
 *   onDelete: async () => {
 *     await deleteProperty(property.id);
 *   },
 *   onSuccess: () => router.refresh(),
 * });
 * 
 * return (
 *   <>
 *     <Button onClick={openDeleteDialog}>Delete</Button>
 *     <DeleteDialog />
 *   </>
 * );
 * ```
 */
export function useDeleteConfirmation({
  entityType,
  entityName,
  onDelete,
  onSuccess,
  onError,
  title,
  description,
}: UseDeleteConfirmationOptions): UseDeleteConfirmationReturn {
  const t = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (!isDeleting) {
      setIsOpen(false);
    }
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success(t("success"), {
        description: `${entityName} has been deleted successfully.`,
      });
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Delete failed");
      console.error(`Failed to delete ${entityType}:`, err);
      toast.error(t("error"), {
        description: t("somethingWentWrong"),
      });
      onError?.(err);
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, onSuccess, onError, entityType, entityName, t]);

  const DeleteDialog: React.FC = useCallback(() => {
    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {title || t("deleteConfirmation.title") || "Are you sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {description || t("deleteConfirmation.description") || "This action cannot be undone."}
              {entityName && (
                <>
                  {" "}
                  <span className="font-medium">"{entityName}"</span> will be permanently deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("delete")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [isOpen, isDeleting, title, description, entityName, t, handleDelete]);

  return {
    DeleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    isDeleting,
    isOpen,
  };
}









