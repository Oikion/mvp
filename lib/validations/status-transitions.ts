/**
 * Status Transition Rules for Business Entities
 * 
 * Defines valid state transitions for Clients, Properties, and Deals.
 * These rules ensure data integrity by preventing invalid status changes.
 * 
 * Business Rules:
 * - CRM-005: Client status transitions
 * - MLS-004: Property status transitions
 * - DEAL-002: Deal status transitions
 */

import type { ClientStatus, PropertyStatus, DealStatus, DealStage } from "@prisma/client";

// =============================================================================
// Client Status Transitions (CRM-005)
// =============================================================================

/**
 * Valid transitions for client status
 * 
 * Flow:
 * - LEAD: New client, not yet qualified
 * - ACTIVE: Actively working with client
 * - INACTIVE: Relationship paused
 * - CONVERTED: Successfully completed transaction
 * - LOST: Lost to competitor or disengaged
 */
export const CLIENT_STATUS_TRANSITIONS: Record<ClientStatus, ClientStatus[]> = {
  LEAD: ["ACTIVE", "LOST"],
  ACTIVE: ["INACTIVE", "CONVERTED", "LOST"],
  INACTIVE: ["ACTIVE", "LOST"],
  CONVERTED: [], // Terminal state - cannot transition out
  LOST: ["LEAD", "ACTIVE"], // Can re-engage
};

/**
 * Check if a client status transition is valid
 */
export function isValidClientTransition(from: ClientStatus, to: ClientStatus): boolean {
  if (from === to) return true; // No change is always valid
  return CLIENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get error message for invalid client status transition
 */
export function getClientTransitionError(from: ClientStatus, to: ClientStatus): string {
  const validNext = CLIENT_STATUS_TRANSITIONS[from];
  if (validNext.length === 0) {
    return `Client status "${from}" is a terminal state and cannot be changed`;
  }
  return `Cannot transition client from "${from}" to "${to}". Valid transitions: ${validNext.join(", ")}`;
}

/**
 * Get all valid next statuses for a client
 */
export function getValidClientNextStatuses(current: ClientStatus): ClientStatus[] {
  return CLIENT_STATUS_TRANSITIONS[current] ?? [];
}

// =============================================================================
// Property Status Transitions (MLS-004)
// =============================================================================

/**
 * Valid transitions for property status
 * 
 * Flow:
 * - ACTIVE: Listed and available
 * - PENDING: Under offer/contract
 * - SOLD: Transaction completed
 * - OFF_MARKET: Temporarily removed
 * - WITHDRAWN: Permanently removed
 */
export const PROPERTY_STATUS_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  ACTIVE: ["PENDING", "WITHDRAWN", "OFF_MARKET"],
  PENDING: ["ACTIVE", "SOLD", "WITHDRAWN"],
  SOLD: ["OFF_MARKET"], // Can only archive after sale
  OFF_MARKET: ["ACTIVE"], // Can re-list
  WITHDRAWN: ["ACTIVE", "OFF_MARKET"], // Can re-list or archive
};

/**
 * Check if a property status transition is valid
 */
export function isValidPropertyTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  if (from === to) return true; // No change is always valid
  return PROPERTY_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get error message for invalid property status transition
 */
export function getPropertyTransitionError(from: PropertyStatus, to: PropertyStatus): string {
  const validNext = PROPERTY_STATUS_TRANSITIONS[from];
  if (validNext.length === 0) {
    return `Property status "${from}" is a terminal state and cannot be changed`;
  }
  return `Cannot transition property from "${from}" to "${to}". Valid transitions: ${validNext.join(", ")}`;
}

/**
 * Get all valid next statuses for a property
 */
export function getValidPropertyNextStatuses(current: PropertyStatus): PropertyStatus[] {
  return PROPERTY_STATUS_TRANSITIONS[current] ?? [];
}

// =============================================================================
// Deal Status Transitions (DEAL-002)
// =============================================================================

/**
 * Valid transitions for deal status
 * 
 * Flow:
 * - PROPOSED: Initial proposal from one agent
 * - NEGOTIATING: Agents discussing terms
 * - ACCEPTED: Both parties agreed
 * - IN_PROGRESS: Transaction underway
 * - COMPLETED: Transaction finished (terminal)
 * - CANCELLED: Deal terminated (terminal)
 */
export const DEAL_STATUS_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  PROPOSED: ["NEGOTIATING", "ACCEPTED", "CANCELLED"],
  NEGOTIATING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Check if a deal status transition is valid
 */
export function isValidDealTransition(from: DealStatus, to: DealStatus): boolean {
  if (from === to) return true; // No change is always valid
  return DEAL_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get error message for invalid deal status transition
 */
export function getDealTransitionError(from: DealStatus, to: DealStatus): string {
  const validNext = DEAL_STATUS_TRANSITIONS[from];
  if (validNext.length === 0) {
    return `Deal status "${from}" is a terminal state and cannot be changed`;
  }
  return `Cannot transition deal from "${from}" to "${to}". Valid transitions: ${validNext.join(", ")}`;
}

/**
 * Get all valid next statuses for a deal
 */
export function getValidDealNextStatuses(current: DealStatus): DealStatus[] {
  return DEAL_STATUS_TRANSITIONS[current] ?? [];
}

// =============================================================================
// Generic Transition Helpers
// =============================================================================

/**
 * Generic transition validation result
 */
export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  validNextStatuses: string[];
}

/**
 * Validate any status transition
 */
export function validateStatusTransition<T extends string>(
  entityType: "client" | "property" | "deal",
  from: T,
  to: T
): TransitionValidationResult {
  switch (entityType) {
    case "client":
      return {
        valid: isValidClientTransition(from as ClientStatus, to as ClientStatus),
        error: isValidClientTransition(from as ClientStatus, to as ClientStatus)
          ? undefined
          : getClientTransitionError(from as ClientStatus, to as ClientStatus),
        validNextStatuses: getValidClientNextStatuses(from as ClientStatus),
      };
    
    case "property":
      return {
        valid: isValidPropertyTransition(from as PropertyStatus, to as PropertyStatus),
        error: isValidPropertyTransition(from as PropertyStatus, to as PropertyStatus)
          ? undefined
          : getPropertyTransitionError(from as PropertyStatus, to as PropertyStatus),
        validNextStatuses: getValidPropertyNextStatuses(from as PropertyStatus),
      };
    
    case "deal":
      return {
        valid: isValidDealTransition(from as DealStatus, to as DealStatus),
        error: isValidDealTransition(from as DealStatus, to as DealStatus)
          ? undefined
          : getDealTransitionError(from as DealStatus, to as DealStatus),
        validNextStatuses: getValidDealNextStatuses(from as DealStatus),
      };
    
    default:
      return {
        valid: false,
        error: `Unknown entity type: ${entityType}`,
        validNextStatuses: [],
      };
  }
}

// =============================================================================
// Transition Metadata
// =============================================================================

/**
 * Metadata about status values for UI display
 */
export interface StatusMetadata {
  value: string;
  label: string;
  labelEl: string;
  color: string;
  isTerminal: boolean;
}

/**
 * Client status metadata for UI
 */
export const CLIENT_STATUS_METADATA: Record<ClientStatus, StatusMetadata> = {
  LEAD: {
    value: "LEAD",
    label: "Lead",
    labelEl: "Υποψήφιος",
    color: "blue",
    isTerminal: false,
  },
  ACTIVE: {
    value: "ACTIVE",
    label: "Active",
    labelEl: "Ενεργός",
    color: "green",
    isTerminal: false,
  },
  INACTIVE: {
    value: "INACTIVE",
    label: "Inactive",
    labelEl: "Ανενεργός",
    color: "gray",
    isTerminal: false,
  },
  CONVERTED: {
    value: "CONVERTED",
    label: "Converted",
    labelEl: "Μετατράπηκε",
    color: "purple",
    isTerminal: true,
  },
  LOST: {
    value: "LOST",
    label: "Lost",
    labelEl: "Χαμένος",
    color: "red",
    isTerminal: false, // Can re-engage
  },
};

/**
 * Property status metadata for UI
 */
export const PROPERTY_STATUS_METADATA: Record<PropertyStatus, StatusMetadata> = {
  ACTIVE: {
    value: "ACTIVE",
    label: "Active",
    labelEl: "Ενεργό",
    color: "green",
    isTerminal: false,
  },
  PENDING: {
    value: "PENDING",
    label: "Pending",
    labelEl: "Σε εκκρεμότητα",
    color: "yellow",
    isTerminal: false,
  },
  SOLD: {
    value: "SOLD",
    label: "Sold",
    labelEl: "Πωλήθηκε",
    color: "purple",
    isTerminal: false, // Can archive
  },
  OFF_MARKET: {
    value: "OFF_MARKET",
    label: "Off Market",
    labelEl: "Εκτός αγοράς",
    color: "gray",
    isTerminal: false,
  },
  WITHDRAWN: {
    value: "WITHDRAWN",
    label: "Withdrawn",
    labelEl: "Αποσύρθηκε",
    color: "red",
    isTerminal: false,
  },
};

/**
 * Deal status metadata for UI
 */
export const DEAL_STATUS_METADATA: Record<DealStatus, StatusMetadata> = {
  PROPOSED: {
    value: "PROPOSED",
    label: "Proposed",
    labelEl: "Προτεινόμενο",
    color: "blue",
    isTerminal: false,
  },
  NEGOTIATING: {
    value: "NEGOTIATING",
    label: "Negotiating",
    labelEl: "Σε διαπραγμάτευση",
    color: "yellow",
    isTerminal: false,
  },
  ACCEPTED: {
    value: "ACCEPTED",
    label: "Accepted",
    labelEl: "Αποδεκτό",
    color: "green",
    isTerminal: false,
  },
  IN_PROGRESS: {
    value: "IN_PROGRESS",
    label: "In Progress",
    labelEl: "Σε εξέλιξη",
    color: "orange",
    isTerminal: false,
  },
  COMPLETED: {
    value: "COMPLETED",
    label: "Completed",
    labelEl: "Ολοκληρωμένο",
    color: "purple",
    isTerminal: true,
  },
  CANCELLED: {
    value: "CANCELLED",
    label: "Cancelled",
    labelEl: "Ακυρωμένο",
    color: "red",
    isTerminal: true,
  },
};

// =============================================================================
// Deal Stage Transitions (v2.0 — 10-stage Greek RE pipeline)
// =============================================================================

/**
 * Ordered list of deal stages in the Greek RE pipeline.
 * Terminal stages (COMPLETED, FALLEN_THROUGH) are at the end.
 */
export const DEAL_STAGE_ORDER: DealStage[] = [
  "INTEREST",
  "OFFER",
  "NEGOTIATION",
  "PRELIMINARY_AGREEMENT",
  "DUE_DILIGENCE",
  "TRANSFER_TAX",
  "SIGNING",
  "REGISTRATION",
  "COMPLETED",
  "FALLEN_THROUGH",
];

/** Terminal stages — no further progression possible */
const DEAL_STAGE_TERMINAL = new Set<DealStage>(["COMPLETED", "FALLEN_THROUGH"]);

/**
 * Valid forward transitions for each deal stage.
 * Any stage can also move to FALLEN_THROUGH (deal collapsed).
 */
export const DEAL_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  INTEREST: ["OFFER", "FALLEN_THROUGH"],
  OFFER: ["NEGOTIATION", "FALLEN_THROUGH"],
  NEGOTIATION: ["PRELIMINARY_AGREEMENT", "FALLEN_THROUGH"],
  PRELIMINARY_AGREEMENT: ["DUE_DILIGENCE", "FALLEN_THROUGH"],
  DUE_DILIGENCE: ["TRANSFER_TAX", "FALLEN_THROUGH"],
  TRANSFER_TAX: ["SIGNING", "FALLEN_THROUGH"],
  SIGNING: ["REGISTRATION", "FALLEN_THROUGH"],
  REGISTRATION: ["COMPLETED", "FALLEN_THROUGH"],
  COMPLETED: [],
  FALLEN_THROUGH: [],
};

/** Returns the zero-based index of a stage in DEAL_STAGE_ORDER, or -1 if not found. */
export function getDealStageIndex(stage: DealStage): number {
  return DEAL_STAGE_ORDER.indexOf(stage);
}

/** Returns true if the stage is a terminal state (no further progression). */
export function isDealStageTerminal(stage: DealStage): boolean {
  return DEAL_STAGE_TERMINAL.has(stage);
}

/** Returns the valid next stages from the current stage. */
export function getValidDealNextStages(current: DealStage): DealStage[] {
  return DEAL_STAGE_TRANSITIONS[current] ?? [];
}

/** Returns true if the transition from → to is valid. */
export function isValidDealStageTransition(from: DealStage, to: DealStage): boolean {
  if (from === to) return true;
  return DEAL_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Returns a human-readable error message for an invalid stage transition. */
export function getDealStageTransitionError(from: DealStage, to: DealStage): string {
  if (isDealStageTerminal(from)) {
    return `Deal stage "${from}" is a terminal state and cannot be changed`;
  }
  const valid = DEAL_STAGE_TRANSITIONS[from];
  return `Cannot transition from "${from}" to "${to}". Valid next stages: ${valid.join(", ")}`;
}
