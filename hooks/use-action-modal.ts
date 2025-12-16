"use client";

import { create } from "zustand";

/**
 * Entity types that can be used with action modals
 */
export type ActionEntityType = "property" | "client" | "contact" | "audience";

/**
 * Share entity types for the ShareModal
 */
export type ShareEntityType = "PROPERTY" | "CLIENT" | "DOCUMENT";

/**
 * Data for the entity being acted upon
 */
export interface ActionEntityData {
  entityType: ActionEntityType;
  entityId: string;
  entityName: string;
  /** Optional delete handler - if provided, delete action is available */
  onDelete?: () => Promise<void>;
  /** Optional callback after any action completes */
  onActionComplete?: () => void;
}

/**
 * Modal types that can be opened
 */
export type ActionModalType = "delete" | "share" | "schedule" | null;

/**
 * State for the action modal store
 */
interface ActionModalState {
  /** Currently open modal type (null if none) */
  modalType: ActionModalType;
  /** Data for the entity being acted upon */
  entityData: ActionEntityData | null;
  /** Whether the action is currently being processed */
  isProcessing: boolean;

  // Actions
  /** Open the delete confirmation modal */
  openDeleteModal: (data: ActionEntityData) => void;
  /** Open the share modal */
  openShareModal: (data: ActionEntityData) => void;
  /** Open the schedule event modal */
  openScheduleModal: (data: ActionEntityData) => void;
  /** Close any open modal */
  closeModal: () => void;
  /** Set processing state */
  setProcessing: (isProcessing: boolean) => void;
}

/**
 * Zustand store for managing shared action modals.
 * 
 * This store enables a single instance of each modal type (delete, share, schedule)
 * to be shared across all entity cards and table rows, instead of rendering
 * thousands of modal instances.
 * 
 * Usage:
 * ```tsx
 * // In a card/row component - open modal
 * const { openDeleteModal } = useActionModal();
 * openDeleteModal({ entityType: "property", entityId: "123", entityName: "My Property", onDelete: handleDelete });
 * 
 * // In a page component - render shared modals
 * <SharedActionModals />
 * ```
 */
export const useActionModal = create<ActionModalState>((set) => ({
  modalType: null,
  entityData: null,
  isProcessing: false,

  openDeleteModal: (data) =>
    set({
      modalType: "delete",
      entityData: data,
      isProcessing: false,
    }),

  openShareModal: (data) =>
    set({
      modalType: "share",
      entityData: data,
      isProcessing: false,
    }),

  openScheduleModal: (data) =>
    set({
      modalType: "schedule",
      entityData: data,
      isProcessing: false,
    }),

  closeModal: () =>
    set({
      modalType: null,
      entityData: null,
      isProcessing: false,
    }),

  setProcessing: (isProcessing) => set({ isProcessing }),
}));

/**
 * Helper function to convert ActionEntityType to ShareEntityType
 */
export function getShareEntityType(entityType: ActionEntityType): ShareEntityType {
  switch (entityType) {
    case "property":
      return "PROPERTY";
    case "client":
    case "contact":
      return "CLIENT";
    default:
      return "CLIENT";
  }
}

