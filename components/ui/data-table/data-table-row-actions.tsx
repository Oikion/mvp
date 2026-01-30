"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Edit, Trash2, CalendarPlus, Share2, LucideIcon, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionModal, type ActionEntityType } from "@/hooks/use-action-modal";

/**
 * Custom action to be added to the quick actions menu
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "destructive";
  shortcut?: string;
  disabled?: boolean;
}

/**
 * Entity types supported by the unified row actions
 */
export type EntityType = "property" | "client" | "contact" | "event" | "task" | "employee" | "user";

/**
 * Props for the unified DataTableRowActions component
 */
export interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  /** Type of entity for this row */
  entityType: EntityType;
  /** ID of the entity - extracted from row if not provided */
  entityId?: string;
  /** Display name of the entity for dialogs */
  entityName?: string | null;
  
  // Standard actions - pass callback to enable, false to explicitly disable
  /** View action - navigates to detail page. Pass path or callback */
  onView?: string | (() => void) | false;
  /** Edit action - opens edit form/page. Pass path or callback */
  onEdit?: string | (() => void) | false;
  /** Delete action - shows confirmation then deletes */
  onDelete?: (() => Promise<void>) | false;
  
  // Optional common actions
  /** Schedule event - opens event creation form linked to this entity */
  onSchedule?: boolean;
  /** Share - opens share modal for this entity */
  onShare?: boolean;
  
  // Custom actions appended after standard ones
  customActions?: QuickAction[];
  
  // Event handlers for refresh after actions
  onActionComplete?: () => void;
}

/**
 * Unified row actions component for data tables.
 * 
 * Uses shared modals via Zustand store for optimal performance.
 * 
 * IMPORTANT: Requires <SharedActionModals /> to be rendered at the page level.
 * 
 * Standard action order:
 * 1. View (always first if enabled)
 * 2. Edit
 * 3. --- separator ---
 * 4. Schedule Event (optional)
 * 5. Share (optional)
 * 6. --- separator ---
 * 7. Custom actions
 * 8. --- separator ---
 * 9. Delete (always last, destructive styling)
 */
export function DataTableRowActions<TData extends { id?: string }>({
  row,
  entityType,
  entityId: providedEntityId,
  entityName,
  onView,
  onEdit,
  onDelete,
  onSchedule = false,
  onShare = false,
  customActions = [],
  onActionComplete,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const t = useTranslations("common");
  const { openDeleteModal, openShareModal, openScheduleModal } = useActionModal();

  // Extract entity ID from row data
  const data = row.original as Record<string, unknown>;
  const entityId = providedEntityId || (data.id as string) || "";
  
  // Get entity name for display in dialogs
  const displayName = entityName || 
    (data.property_name as string) || 
    (data.name as string) || 
    (data.first_name ? `${data.first_name} ${data.last_name || ""}`.trim() : "") ||
    t("unnamed");

  // Get the base path for navigation based on entity type
  const getBasePath = (): string => {
    switch (entityType) {
      case "property":
        return "/app/mls";
      case "client":
        return "/app/crm";
      case "contact":
        return "/app/crm/contacts";
      case "event":
        return "/app/calendar/events";
      case "task":
        return "/app/crm/tasks/viewtask";
      case "employee":
        return "/app/employees";
      case "user":
        return "/app/admin/users";
      default:
        return "";
    }
  };

  // Handle view action
  const handleView = () => {
    if (typeof onView === "string") {
      router.push(onView);
    } else if (typeof onView === "function") {
      onView();
    } else if (onView !== false) {
      // Default behavior: navigate to detail page
      router.push(`${getBasePath()}/${entityId}`);
    }
  };

  // Handle edit action
  const handleEdit = () => {
    if (typeof onEdit === "string") {
      router.push(onEdit);
    } else if (typeof onEdit === "function") {
      onEdit();
    } else if (onEdit !== false) {
      // Default behavior: navigate to edit page
      router.push(`${getBasePath()}/${entityId}/edit`);
    }
  };

  // Handle delete - open shared modal
  const handleDeleteClick = () => {
    if (typeof onDelete !== "function") return;
    
    // Map EntityType to ActionEntityType (only some types support modals)
    const actionEntityType: ActionEntityType = 
      entityType === "property" ? "property" :
      entityType === "client" ? "client" :
      entityType === "contact" ? "contact" :
      "client"; // Default fallback
    
    openDeleteModal({
      entityType: actionEntityType,
      entityId,
      entityName: displayName,
      onDelete,
      onActionComplete,
    });
  };

  // Handle schedule - open shared modal
  const handleScheduleClick = () => {
    const actionEntityType: ActionEntityType = 
      entityType === "property" ? "property" :
      entityType === "client" ? "client" :
      entityType === "contact" ? "contact" :
      "client";
    
    openScheduleModal({
      entityType: actionEntityType,
      entityId,
      entityName: displayName,
      onActionComplete,
    });
  };

  // Handle share - open shared modal
  const handleShareClick = () => {
    const actionEntityType: ActionEntityType = 
      entityType === "property" ? "property" :
      entityType === "client" ? "client" :
      "client";
    
    openShareModal({
      entityType: actionEntityType,
      entityId,
      entityName: displayName,
      onActionComplete,
    });
  };

  // Determine which actions to show
  const showView = onView !== false;
  const showEdit = onEdit !== false && typeof onEdit !== "undefined";
  const showDelete = typeof onDelete === "function";
  const showScheduleAction = onSchedule && (entityType === "property" || entityType === "client" || entityType === "contact");
  const showShareAction = onShare && (entityType === "property" || entityType === "client");

  // Check if we need separators
  const hasStandardActions = showView || showEdit;
  const hasOptionalActions = showScheduleAction || showShareAction;
  const hasCustomActions = customActions.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t("actions")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        {/* Standard Actions: View, Edit */}
        {showView && (
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            {t("view")}
          </DropdownMenuItem>
        )}
        {showEdit && (
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {t("edit")}
          </DropdownMenuItem>
        )}

        {/* Separator after standard actions */}
        {hasStandardActions && (hasOptionalActions || hasCustomActions || showDelete) && (
          <DropdownMenuSeparator />
        )}

        {/* Optional Actions: Schedule, Share */}
        {showScheduleAction && (
          <DropdownMenuItem onClick={handleScheduleClick}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("scheduleEvent") || "Schedule Event"}
          </DropdownMenuItem>
        )}
        {showShareAction && (
          <DropdownMenuItem onClick={handleShareClick}>
            <Share2 className="mr-2 h-4 w-4" />
            {t("share") || "Share"}
          </DropdownMenuItem>
        )}

        {/* Separator after optional actions */}
        {hasOptionalActions && (hasCustomActions || showDelete) && (
          <DropdownMenuSeparator />
        )}

        {/* Custom Actions */}
        {customActions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={action.variant === "destructive" ? "text-destructive focus:text-destructive" : ""}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
            {action.shortcut && (
              <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        ))}

        {/* Separator before delete */}
        {hasCustomActions && showDelete && <DropdownMenuSeparator />}

        {/* Delete Action - always last */}
        {showDelete && (
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
            <DropdownMenuShortcut>⌘/Ctrl+⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}







