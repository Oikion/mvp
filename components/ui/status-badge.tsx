"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  getStatusConfig,
  type EntityType,
  type StatusConfig,
  type BadgeVariant,
} from "@/lib/status-mappings";

/**
 * StatusBadge - Standardized status indicator with consistent styling
 *
 * Uses centralized status mappings for consistent colors and icons
 * across the application.
 *
 * @example
 * ```tsx
 * // Using entity type and status
 * <StatusBadge entityType="property" status="ACTIVE" />
 *
 * // With custom label override
 * <StatusBadge entityType="client" status="LEAD" label="New Lead" />
 *
 * // Without icon
 * <StatusBadge entityType="job" status="running" showIcon={false} />
 *
 * // Custom config (bypass mappings)
 * <StatusBadge
 *   variant="success"
 *   label="Custom Status"
 *   icon={CheckCircle}
 * />
 * ```
 */

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  /**
   * Entity type for status mapping lookup
   */
  entityType?: EntityType;
  /**
   * Status value to display
   */
  status?: string;
  /**
   * Override the label from status mapping
   */
  label?: string;
  /**
   * Override the variant from status mapping
   */
  variant?: BadgeVariant;
  /**
   * Override the icon from status mapping
   */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Whether to show the icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Whether to animate the icon (for loading states)
   */
  animate?: boolean;
}

export function StatusBadge({
  entityType = "generic",
  status,
  label,
  variant,
  icon: IconOverride,
  showIcon = true,
  animate,
  size,
  className,
  ...props
}: Readonly<StatusBadgeProps>) {
  // Get configuration from mappings
  const config: StatusConfig | undefined = status
    ? getStatusConfig(entityType, status)
    : undefined;

  // Determine final values (props override config)
  const finalVariant = variant ?? config?.variant ?? "secondary";
  const finalLabel = label ?? config?.label ?? status ?? "Unknown";
  const Icon = IconOverride ?? config?.icon;
  const shouldAnimate = animate ?? config?.animate ?? false;

  // Icon size based on badge size
  const getIconSize = () => {
    if (size === "sm") return "h-3 w-3";
    if (size === "lg") return "h-4 w-4";
    return "h-3.5 w-3.5";
  };
  const iconSize = getIconSize();

  return (
    <Badge
      variant={finalVariant}
      size={size}
      className={cn("gap-1", className)}
      {...props}
    >
      {showIcon && Icon && (
        <Icon
          className={cn(
            iconSize,
            shouldAnimate && "animate-spin"
          )}
        />
      )}
      {finalLabel}
    </Badge>
  );
}

/**
 * StatusDot - Simple status dot indicator without text
 *
 * @example
 * ```tsx
 * <StatusDot status="online" />
 * <StatusDot status="offline" />
 * ```
 */
type StatusDotStatus = "online" | "offline" | "busy" | "away";

export function StatusDot({
  status,
  className,
}: Readonly<{
  status: StatusDotStatus | string;
  className?: string;
}>) {
  const statusColors: Record<string, string> = {
    online: "bg-success",
    offline: "bg-muted-foreground",
    busy: "bg-destructive",
    away: "bg-warning",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        statusColors[status] ?? "bg-muted-foreground",
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}

/**
 * StatusIndicator - Status with dot and optional text
 *
 * @example
 * ```tsx
 * <StatusIndicator status="online" showText />
 * <StatusIndicator status="away" />
 * ```
 */
export function StatusIndicator({
  status,
  showText = false,
  className,
}: Readonly<{
  status: StatusDotStatus;
  showText?: boolean;
  className?: string;
}>) {
  const statusLabels: Record<string, string> = {
    online: "Online",
    offline: "Offline",
    busy: "Busy",
    away: "Away",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusDot status={status} />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {statusLabels[status]}
        </span>
      )}
    </span>
  );
}
