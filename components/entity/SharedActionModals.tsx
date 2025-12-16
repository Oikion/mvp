"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useActionModal, getShareEntityType } from "@/hooks/use-action-modal";

// Lazy load heavy modal components for better initial load performance
const ShareModal = dynamic(
  () => import("@/components/social/ShareModal").then((m) => ({ default: m.ShareModal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const EventCreateFormContent = dynamic(
  () => import("@/components/calendar/EventCreateFormContent"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/**
 * Shared action modals component.
 * 
 * Renders a single instance of each modal type (delete, share, schedule)
 * that is shared across all entity cards and table rows.
 * 
 * This dramatically improves performance by eliminating thousands of
 * modal instances from the DOM.
 * 
 * Usage:
 * Add this component once at the page/layout level:
 * ```tsx
 * <PropertiesPageView>
 *   <VirtualizedGrid>...</VirtualizedGrid>
 *   <SharedActionModals />
 * </PropertiesPageView>
 * ```
 */
export function SharedActionModals() {
  const router = useRouter();
  const t = useTranslations("common");
  const { modalType, entityData, isProcessing, closeModal, setProcessing } = useActionModal();

  const handleDelete = async () => {
    if (!entityData?.onDelete) return;

    setProcessing(true);
    try {
      await entityData.onDelete();
      toast.success(t("success"), {
        description: `${entityData.entityName} ${t("delete").toLowerCase()}d successfully`,
      });
      closeModal();
      entityData.onActionComplete?.();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(t("error"), {
        description: t("somethingWentWrong"),
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleSuccess = () => {
    closeModal();
    entityData?.onActionComplete?.();
    router.refresh();
  };

  const handleShareClose = (open: boolean) => {
    if (!open) {
      closeModal();
    }
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={modalType === "delete"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmation.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmation.description")}
              {entityData?.entityName && ` "${entityData.entityName}" will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? t("loading") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Event Dialog */}
      <Dialog
        open={modalType === "schedule"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("scheduleEvent")}</DialogTitle>
            <DialogDescription>
              {entityData?.entityName && `Schedule an event for "${entityData.entityName}"`}
            </DialogDescription>
          </DialogHeader>
          {modalType === "schedule" && entityData && (
            <EventCreateFormContent
              propertyId={entityData.entityType === "property" ? entityData.entityId : undefined}
              clientId={
                entityData.entityType === "client" || entityData.entityType === "contact"
                  ? entityData.entityId
                  : undefined
              }
              onSuccess={handleScheduleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      {modalType === "share" && entityData && (
        <ShareModal
          open={true}
          onOpenChange={handleShareClose}
          entityType={getShareEntityType(entityData.entityType)}
          entityId={entityData.entityId}
          entityName={entityData.entityName}
        />
      )}
    </>
  );
}

