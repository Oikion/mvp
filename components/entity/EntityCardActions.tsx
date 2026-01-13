"use client";

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
import { useActionModal } from "@/hooks/use-action-modal";

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
 * 
 * Uses shared modals via Zustand store for optimal performance.
 * Provides consistent View, Edit, Schedule, Share, and Delete actions.
 * 
 * IMPORTANT: Requires <SharedActionModals /> to be rendered at the page level.
 * 
 * Usage:
 * ```tsx
 * // In page component
 * <PropertiesPageView>
 *   <PropertyCard ... />
 *   <SharedActionModals />
 * </PropertiesPageView>
 * 
 * // In card component
 * <EntityCardActions
 *   entityType="property"
 *   entityId={property.id}
 *   entityName={property.name}
 *   viewHref={`/app/mls/properties/${property.id}`}
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
  const t = useTranslations("common");
  const { openDeleteModal, openShareModal, openScheduleModal } = useActionModal();

  const displayName = entityName || t("unnamed");

  // Get default view path based on entity type
  const getDefaultViewPath = (): string => {
    switch (entityType) {
      case "property":
        return `/app/mls/properties/${entityId}`;
      case "client":
        return `/app/crm/clients/${entityId}`;
      case "contact":
        return `/app/crm/contacts/${entityId}`;
      case "audience":
        return `/app/audiences/${entityId}`;
      default:
        return "#";
    }
  };

  // Handle delete - open shared modal
  const handleDeleteClick = () => {
    if (!onDelete) return;
    openDeleteModal({
      entityType,
      entityId,
      entityName: displayName,
      onDelete,
      onActionComplete,
    });
  };

  // Handle schedule - open shared modal
  const handleScheduleClick = () => {
    openScheduleModal({
      entityType,
      entityId,
      entityName: displayName,
      onActionComplete,
    });
  };

  // Handle share - open shared modal
  const handleShareClick = () => {
    openShareModal({
      entityType,
      entityId,
      entityName: displayName,
      onActionComplete,
    });
  };

  const actualViewHref = viewHref || getDefaultViewPath();
  const hasDelete = typeof onDelete === "function";
  const hasEdit = typeof onEdit === "function";
  const hasOptionalActions = showSchedule || showShare;
  const hasCustomActions = customActions.length > 0;

  return (
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

        {/* Separator after view/edit */}
        {(hasOptionalActions || hasCustomActions || hasDelete) && (
          <DropdownMenuSeparator />
        )}

        {/* Schedule Action */}
        {showSchedule && (
          <DropdownMenuItem onClick={handleScheduleClick}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("scheduleEvent")}
          </DropdownMenuItem>
        )}

        {/* Share Action */}
        {showShare && (
          <DropdownMenuItem onClick={handleShareClick}>
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
            onClick={handleDeleteClick}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}







