/**
 * Centralized Status Mappings
 *
 * This file provides consistent status-to-variant mappings across the application.
 * Use these mappings with the StatusBadge component for consistent status display.
 *
 * @example
 * ```tsx
 * import { getStatusConfig, STATUS_CONFIGS } from "@/lib/status-mappings";
 *
 * // Get config for a specific status
 * const config = getStatusConfig("property", "ACTIVE");
 * // { variant: "success", icon: CheckCircle, label: "Active" }
 *
 * // Or use StatusBadge component directly
 * <StatusBadge entityType="property" status="ACTIVE" />
 * ```
 */

import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Ban,
  TrendingUp,
  Users,
  UserMinus,
  Target,
  Handshake,
  FileText,
  Send,
  Calendar,
  Eye,
  type LucideIcon,
} from "lucide-react";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"
  | "purple"
  | "gray";

export interface StatusConfig {
  variant: BadgeVariant;
  icon?: LucideIcon;
  label: string;
  /** Optional: animate the icon (e.g., for loading states) */
  animate?: boolean;
}

/**
 * Property Status Configuration
 */
export const PROPERTY_STATUS: Record<string, StatusConfig> = {
  ACTIVE: {
    variant: "success",
    icon: CheckCircle,
    label: "Active",
  },
  PENDING: {
    variant: "warning",
    icon: Clock,
    label: "Pending",
  },
  SOLD: {
    variant: "purple",
    icon: Handshake,
    label: "Sold",
  },
  RENTED: {
    variant: "purple",
    icon: Handshake,
    label: "Rented",
  },
  OFF_MARKET: {
    variant: "secondary",
    icon: Eye,
    label: "Off Market",
  },
  WITHDRAWN: {
    variant: "destructive",
    icon: XCircle,
    label: "Withdrawn",
  },
  DRAFT: {
    variant: "outline",
    icon: FileText,
    label: "Draft",
  },
};

/**
 * Client Status Configuration
 */
export const CLIENT_STATUS: Record<string, StatusConfig> = {
  LEAD: {
    variant: "info",
    icon: Target,
    label: "Lead",
  },
  ACTIVE: {
    variant: "success",
    icon: CheckCircle,
    label: "Active",
  },
  INACTIVE: {
    variant: "secondary",
    icon: UserMinus,
    label: "Inactive",
  },
  CONVERTED: {
    variant: "purple",
    icon: TrendingUp,
    label: "Converted",
  },
  LOST: {
    variant: "destructive",
    icon: XCircle,
    label: "Lost",
  },
};

/**
 * Deal Status Configuration
 */
export const DEAL_STATUS: Record<string, StatusConfig> = {
  PROPOSED: {
    variant: "warning",
    icon: FileText,
    label: "Proposed",
  },
  NEGOTIATING: {
    variant: "info",
    icon: Users,
    label: "Negotiating",
  },
  ACCEPTED: {
    variant: "success",
    icon: CheckCircle,
    label: "Accepted",
  },
  IN_PROGRESS: {
    variant: "info",
    icon: Loader2,
    label: "In Progress",
    animate: true,
  },
  COMPLETED: {
    variant: "purple",
    icon: Handshake,
    label: "Completed",
  },
  CANCELLED: {
    variant: "gray",
    icon: Ban,
    label: "Cancelled",
  },
};

/**
 * Job/Task Status Configuration
 */
export const JOB_STATUS: Record<string, StatusConfig> = {
  pending: {
    variant: "warning",
    icon: Clock,
    label: "Pending",
  },
  running: {
    variant: "info",
    icon: Loader2,
    label: "Running",
    animate: true,
  },
  completed: {
    variant: "success",
    icon: CheckCircle,
    label: "Completed",
  },
  failed: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
  cancelled: {
    variant: "secondary",
    icon: Ban,
    label: "Cancelled",
  },
};

/**
 * Campaign/Newsletter Status Configuration
 */
export const CAMPAIGN_STATUS: Record<string, StatusConfig> = {
  DRAFT: {
    variant: "outline",
    icon: FileText,
    label: "Draft",
  },
  SCHEDULED: {
    variant: "purple",
    icon: Calendar,
    label: "Scheduled",
  },
  SENDING: {
    variant: "info",
    icon: Loader2,
    label: "Sending",
    animate: true,
  },
  SENT: {
    variant: "success",
    icon: Send,
    label: "Sent",
  },
  FAILED: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
  CANCELLED: {
    variant: "secondary",
    icon: Ban,
    label: "Cancelled",
  },
};

/**
 * Social Post Status Configuration
 */
export const SOCIAL_STATUS: Record<string, StatusConfig> = {
  PENDING: {
    variant: "outline",
    icon: Clock,
    label: "Pending",
  },
  SCHEDULED: {
    variant: "purple",
    icon: Calendar,
    label: "Scheduled",
  },
  POSTING: {
    variant: "info",
    icon: Loader2,
    label: "Posting",
    animate: true,
  },
  POSTED: {
    variant: "success",
    icon: CheckCircle,
    label: "Posted",
  },
  FAILED: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
};

/**
 * Publishing/Sync Status Configuration
 */
export const PUBLISH_STATUS: Record<string, StatusConfig> = {
  SUCCESS: {
    variant: "success",
    icon: CheckCircle,
    label: "Success",
  },
  PENDING: {
    variant: "warning",
    icon: Clock,
    label: "Pending",
  },
  PROCESSING: {
    variant: "info",
    icon: Loader2,
    label: "Processing",
    animate: true,
  },
  FAILED: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
  SKIPPED: {
    variant: "gray",
    icon: AlertCircle,
    label: "Skipped",
  },
};

/**
 * Generic Status Configuration (fallback)
 */
export const GENERIC_STATUS: Record<string, StatusConfig> = {
  ACTIVE: {
    variant: "success",
    icon: CheckCircle,
    label: "Active",
  },
  INACTIVE: {
    variant: "secondary",
    label: "Inactive",
  },
  PENDING: {
    variant: "warning",
    icon: Clock,
    label: "Pending",
  },
  COMPLETED: {
    variant: "success",
    icon: CheckCircle,
    label: "Completed",
  },
  FAILED: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
  CANCELLED: {
    variant: "gray",
    icon: Ban,
    label: "Cancelled",
  },
};

/**
 * All status configurations by entity type
 */
export const STATUS_CONFIGS = {
  property: PROPERTY_STATUS,
  client: CLIENT_STATUS,
  deal: DEAL_STATUS,
  job: JOB_STATUS,
  campaign: CAMPAIGN_STATUS,
  social: SOCIAL_STATUS,
  publish: PUBLISH_STATUS,
  generic: GENERIC_STATUS,
} as const;

export type EntityType = keyof typeof STATUS_CONFIGS;

/**
 * Get status configuration for a specific entity type and status
 *
 * @param entityType - The type of entity (property, client, deal, etc.)
 * @param status - The status value
 * @returns StatusConfig object or undefined if not found
 *
 * @example
 * ```tsx
 * const config = getStatusConfig("property", "ACTIVE");
 * // { variant: "success", icon: CheckCircle, label: "Active" }
 * ```
 */
export function getStatusConfig(
  entityType: EntityType,
  status: string
): StatusConfig | undefined {
  const configs = STATUS_CONFIGS[entityType];
  return configs[status] ?? GENERIC_STATUS[status];
}

/**
 * Get variant for a status (shorthand)
 *
 * @param entityType - The type of entity
 * @param status - The status value
 * @returns Badge variant string
 */
export function getStatusVariant(
  entityType: EntityType,
  status: string
): BadgeVariant {
  return getStatusConfig(entityType, status)?.variant ?? "secondary";
}

/**
 * Get label for a status (shorthand)
 *
 * @param entityType - The type of entity
 * @param status - The status value
 * @returns Human-readable label
 */
export function getStatusLabel(
  entityType: EntityType,
  status: string
): string {
  return getStatusConfig(entityType, status)?.label ?? status;
}
