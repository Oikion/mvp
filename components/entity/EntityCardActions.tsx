"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Eye,
  Edit,
  Trash2,
  CalendarPlus,
  Share2,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EventCreateForm } from "@/components/calendar/EventCreateForm";
import { ShareModal } from "@/components/social/ShareModal";
import { toast } from "sonner";

/**
 * Custom action to be added to the card actions menu
 */
export interface CardAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

/**
 * Props for the EntityCardActions component
 */
export interface EntityCardActionsProps {
  /** Type of entity */
  entityType: "property" | "client" | "contact" | "audience";
  /** ID of the entity */
  entityId: string;
  /** Display name for dialogs */
  entityName?: string;
  /** Link to view the entity (if different from default) */
  viewHref?: string;
  /** Callback for edit action */
  onEdit?: () => void;
  /** Async callback for delete action */
  onDelete?: () => Promise<void>;
  /** Enable schedule event action */
  showSchedule?: boolean;
  /** Enable share action */
  showShare?: boolean;
  /** Custom actions to add */
  customActions?: CardAction[];
  /** Callback after actions complete */
  onActionComplete?: () => void;
  /** Button variant */
  buttonVariant?: "ghost" | "outline";
  /** Button size */
  buttonSize?: "sm" | "icon";
}

/**
 * Unified card actions component for entity cards.
 * Provides consistent View, Edit, Schedule, Share, and Delete actions.
 * 
 * Usage:
 * ```tsx
 * <EntityCardActions
 *   entityType="property"
 *   entityId={property.id}
 *   entityName={property.name}
 *   viewHref={`/mls/properties/${property.id}`}
 *   onDelete={async () => await deleteProperty(property.id)}
 *   showSchedule
 *   showShare
 * />
 * ```
 */
export function EntityCardActions({
  entityType,
  entityId,
  entityName,
  viewHref,
  onEdit,
  onDelete,
  showSchedule = false,
  showShare = false,
  customActions = [],
  onActionComplete,
  buttonVariant = "ghost",
  buttonSize = "icon",
}: EntityCardActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const displayName = entityName || t("unnamed");

  // Get default view path based on entity type
  const getDefaultViewPath = (): string => {
    switch (entityType) {
      case "property":
        return `/mls/properties/${entityId}`;
      case "client":
        return `/crm/clients/${entityId}`;
      case "contact":
        return `/crm/contacts/${entityId}`;
      case "audience":
        return `/audiences/${entityId}`;
      default:
        return "#";
    }
  };

  // Map entity type to share modal entity type
  const getShareEntityType = (): "PROPERTY" | "CLIENT" => {
    switch (entityType) {
      case "property":
        return "PROPERTY";
      case "client":
      case "contact":
        return "CLIENT";
      default:
        return "CLIENT";
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete();
      toast.success(t("success"), {
        description: `${displayName} ${t("delete").toLowerCase()}d successfully`,
      });
      setDeleteDialogOpen(false);
      onActionComplete?.();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(t("error"), {
        description: t("somethingWentWrong"),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle schedule event created
  const handleEventCreated = () => {
    setScheduleDialogOpen(false);
    onActionComplete?.();
    router.refresh();
  };

  const actualViewHref = viewHref || getDefaultViewPath();
  const hasDelete = typeof onDelete === "function";
  const hasEdit = typeof onEdit === "function";
  const hasOptionalActions = showSchedule || showShare;
  const hasCustomActions = customActions.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            className={buttonSize === "icon" ? "h-8 w-8" : ""}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {/* View Action */}
          <DropdownMenuItem asChild>
            <Link href={actualViewHref}>
              <Eye className="mr-2 h-4 w-4" />
              {t("view")}
            </Link>
          </DropdownMenuItem>

          {/* Edit Action */}
          {hasEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t("edit")}
            </DropdownMenuItem>
          )}

          {/* Separator */}
          {(hasEdit || true) && (hasOptionalActions || hasCustomActions || hasDelete) && (
            <DropdownMenuSeparator />
          )}

          {/* Schedule Action */}
          {showSchedule && (
            <DropdownMenuItem onClick={() => setScheduleDialogOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              {t("scheduleEvent")}
            </DropdownMenuItem>
          )}

          {/* Share Action */}
          {showShare && (
            <DropdownMenuItem onClick={() => setShareModalOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              {t("share")}
            </DropdownMenuItem>
          )}

          {/* Separator before custom actions */}
          {hasOptionalActions && (hasCustomActions || hasDelete) && (
            <DropdownMenuSeparator />
          )}

          {/* Custom Actions */}
          {customActions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.variant === "destructive"
                  ? "text-destructive focus:text-destructive"
                  : ""
              }
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}

          {/* Separator before delete */}
          {hasCustomActions && hasDelete && <DropdownMenuSeparator />}

          {/* Delete Action */}
          {hasDelete && (
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      {hasDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("deleteConfirmation.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmation.description")}
                {displayName && ` "${displayName}" will be permanently deleted.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t("loading") : t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Schedule Event Dialog */}
      {showSchedule && (
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("scheduleEvent")}</DialogTitle>
              <DialogDescription>
                {`Schedule an event for "${displayName}"`}
              </DialogDescription>
            </DialogHeader>
            <EventCreateForm
              propertyId={entityType === "property" ? entityId : undefined}
              clientId={
                entityType === "client" || entityType === "contact"
                  ? entityId
                  : undefined
              }
              onSuccess={handleEventCreated}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          entityType={getShareEntityType()}
          entityId={entityId}
          entityName={displayName}
        />
      )}
    </>
  );
}

