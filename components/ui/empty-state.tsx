"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  FileX,
  FolderX,
  Users,
  Building2,
  CalendarX,
  FileQuestion,
  Bell,
  MessageSquare,
  Search,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

/**
 * EmptyState - Standardized empty state component
 *
 * Provides consistent empty state UI across the application:
 * - Icon (customizable or preset based on type)
 * - Title (translated or custom)
 * - Description (optional)
 * - Action button (optional)
 *
 * @example
 * ```tsx
 * // Using preset type
 * <EmptyState type="clients" onAction={() => router.push('/crm/clients/new')} />
 *
 * // Custom configuration
 * <EmptyState
 *   icon={<Package className="h-12 w-12" />}
 *   title="No orders yet"
 *   description="When customers place orders, they'll appear here"
 *   action={{
 *     label: "Create Order",
 *     onClick: () => setOpen(true),
 *   }}
 * />
 *
 * // Search no results
 * <EmptyState type="search" searchTerm={query} />
 *
 * // Error state
 * <EmptyState type="error" onRetry={() => refetch()} />
 * ```
 */

/**
 * Preset empty state types with default icons and translations
 */
export type EmptyStateType =
  | "clients"
  | "properties"
  | "tasks"
  | "documents"
  | "events"
  | "notifications"
  | "comments"
  | "search"
  | "error"
  | "generic";

/**
 * Configuration for preset types
 */
const presetConfig: Record<
  EmptyStateType,
  {
    icon: LucideIcon;
    titleKey: string;
    descriptionKey?: string;
    actionKey?: string;
  }
> = {
  clients: {
    icon: Users,
    titleKey: "noClients",
    descriptionKey: "createFirst",
    actionKey: "createClient",
  },
  properties: {
    icon: Building2,
    titleKey: "noProperties",
    descriptionKey: "createFirst",
    actionKey: "createProperty",
  },
  tasks: {
    icon: FileX,
    titleKey: "noTasks",
    descriptionKey: "createFirst",
    actionKey: "createTask",
  },
  documents: {
    icon: FolderX,
    titleKey: "noDocuments",
    descriptionKey: "createFirst",
    actionKey: "upload",
  },
  events: {
    icon: CalendarX,
    titleKey: "noEvents",
    descriptionKey: "createFirst",
    actionKey: "createEvent",
  },
  notifications: {
    icon: Bell,
    titleKey: "noNotifications",
  },
  comments: {
    icon: MessageSquare,
    titleKey: "noComments",
  },
  search: {
    icon: Search,
    titleKey: "searchNoResults",
  },
  error: {
    icon: AlertCircle,
    titleKey: "loadFailed",
  },
  generic: {
    icon: FileQuestion,
    titleKey: "noData",
  },
};

export interface EmptyStateAction {
  /**
   * Button label
   */
  label: string;
  /**
   * Click handler
   */
  onClick: () => void;
  /**
   * Button variant. Default: "default"
   */
  variant?: ButtonProps["variant"];
  /**
   * Button size. Default: "default"
   */
  size?: ButtonProps["size"];
}

export interface EmptyStateProps {
  /**
   * Preset type for automatic icon/text configuration
   */
  type?: EmptyStateType;
  /**
   * Custom icon (overrides preset)
   */
  icon?: React.ReactNode;
  /**
   * Custom title (overrides preset)
   */
  title?: string;
  /**
   * Custom description (overrides preset)
   */
  description?: string;
  /**
   * Action button configuration
   */
  action?: EmptyStateAction;
  /**
   * Handler for preset types with default action
   */
  onAction?: () => void;
  /**
   * Handler for retry (used with error type)
   */
  onRetry?: () => void;
  /**
   * Search term to display (used with search type)
   */
  searchTerm?: string;
  /**
   * Size variant
   */
  size?: "sm" | "default" | "lg";
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Whether to show in a compact inline style
   */
  inline?: boolean;
}

const sizeConfig = {
  sm: {
    container: "py-6",
    icon: "h-8 w-8",
    title: "text-sm",
    description: "text-xs",
    button: "sm" as const,
  },
  default: {
    container: "py-12",
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-sm",
    button: "default" as const,
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-base",
    button: "lg" as const,
  },
};

export function EmptyState({
  type = "generic",
  icon,
  title,
  description,
  action,
  onAction,
  onRetry,
  searchTerm,
  size = "default",
  className,
  inline = false,
}: Readonly<EmptyStateProps>) {
  const tEmpty = useTranslations("emptyStates");
  const tButtons = useTranslations("buttons");

  const preset = presetConfig[type];
  const IconComponent = preset.icon;
  const sizeStyles = sizeConfig[size];

  // Determine the icon to display
  const displayIcon = icon ?? (
    <IconComponent
      className={cn(sizeStyles.icon, "text-muted-foreground/50")}
      strokeWidth={1.5}
    />
  );

  // Determine the title
  let displayTitle = title;
  if (!displayTitle) {
    if (type === "search" && searchTerm) {
      displayTitle = `${tEmpty("searchNoResults")}: "${searchTerm}"`;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      displayTitle = tEmpty(preset.titleKey as any);
    }
  }

  // Determine the description
  let displayDescription = description;
  if (!displayDescription && preset.descriptionKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    displayDescription = tEmpty(preset.descriptionKey as any);
  }

  // Determine the action
  let displayAction = action;
  if (!displayAction && onAction && preset.actionKey) {
    displayAction = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      label: tButtons(preset.actionKey as any),
      onClick: onAction,
    };
  }
  if (!displayAction && type === "error" && onRetry) {
    displayAction = {
      label: tButtons("retry"),
      onClick: onRetry,
    };
  }

  if (inline) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 text-muted-foreground",
          className
        )}
      >
        {displayIcon}
        <div>
          <p className={cn("font-medium", sizeStyles.title)}>{displayTitle}</p>
          {displayDescription && (
            <p className={cn("text-muted-foreground", sizeStyles.description)}>
              {displayDescription}
            </p>
          )}
        </div>
        {displayAction && (
          <Button
            variant={displayAction.variant ?? "outline"}
            size={displayAction.size ?? "sm"}
            onClick={displayAction.onClick}
            className="ml-auto"
          >
            {displayAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeStyles.container,
        className
      )}
    >
      <div className="rounded-full bg-muted/50 p-4 mb-4">{displayIcon}</div>

      <h3 className={cn("font-semibold text-foreground", sizeStyles.title)}>
        {displayTitle}
      </h3>

      {displayDescription && (
        <p
          className={cn(
            "mt-2 max-w-sm text-muted-foreground",
            sizeStyles.description
          )}
        >
          {displayDescription}
        </p>
      )}

      {displayAction && (
        <Button
          variant={displayAction.variant ?? "default"}
          size={displayAction.size ?? sizeStyles.button}
          onClick={displayAction.onClick}
          className="mt-6"
        >
          {displayAction.label}
        </Button>
      )}
    </div>
  );
}

/**
 * EmptyStateCard - Empty state wrapped in a card
 *
 * Use when the empty state needs to be contained within a card boundary
 */
export function EmptyStateCard(props: Readonly<EmptyStateProps>) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5">
      <EmptyState {...props} />
    </div>
  );
}

/**
 * EmptyStateTable - Empty state for data tables
 *
 * Designed to span all columns of a table
 */
export interface EmptyStateTableProps extends EmptyStateProps {
  colSpan?: number;
}

export function EmptyStateTable({ colSpan, ...props }: Readonly<EmptyStateTableProps>) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-24">
        <EmptyState {...props} size="sm" />
      </td>
    </tr>
  );
}
