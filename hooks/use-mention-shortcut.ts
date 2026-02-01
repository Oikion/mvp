"use client";

import { create } from "zustand";
import { RefObject } from "react";

/**
 * Entity category types for mention shortcuts
 */
export type MentionCategory = "clients" | "properties" | "documents";

/**
 * Information about the active input that can receive mentions
 */
export interface ActiveInputInfo {
  /** Reference to the input/textarea element */
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  /** Callback to insert mention text at cursor */
  insertMention: (entityName: string, entityId: string, entityType: MentionCategory) => void;
  /** Current cursor position */
  cursorPosition?: number;
}

/**
 * Selected entity from the overlay
 */
export interface SelectedEntity {
  id: string;
  name: string;
  type: MentionCategory;
}

/**
 * State for mention shortcut store
 */
interface MentionShortcutState {
  /** Whether the overlay is open */
  isOpen: boolean;
  /** Currently active category */
  activeCategory: MentionCategory | null;
  /** Information about the currently focused input */
  activeInput: ActiveInputInfo | null;
  /** Search query for filtering entities */
  searchQuery: string;
  /** Currently highlighted index in the list */
  highlightedIndex: number;

  // Actions
  /** Open the overlay for a specific category */
  openCategory: (category: MentionCategory) => void;
  /** Close the overlay */
  close: () => void;
  /** Register an active input that can receive mentions */
  setActiveInput: (input: ActiveInputInfo | null) => void;
  /** Update the search query */
  setSearchQuery: (query: string) => void;
  /** Set the highlighted index */
  setHighlightedIndex: (index: number) => void;
  /** Move highlight up */
  moveHighlightUp: () => void;
  /** Move highlight down (requires max index) */
  moveHighlightDown: (maxIndex: number) => void;
  /** Select entity by index (1-9 for quick select) */
  selectByIndex: (index: number) => void;
}

/**
 * Zustand store for managing mention shortcut overlay state
 */
export const useMentionShortcut = create<MentionShortcutState>((set, get) => ({
  isOpen: false,
  activeCategory: null,
  activeInput: null,
  searchQuery: "",
  highlightedIndex: 0,

  openCategory: (category) => {
    set({
      isOpen: true,
      activeCategory: category,
      searchQuery: "",
      highlightedIndex: 0,
    });
  },

  close: () => {
    set({
      isOpen: false,
      activeCategory: null,
      searchQuery: "",
      highlightedIndex: 0,
    });
  },

  setActiveInput: (input) => {
    set({ activeInput: input });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, highlightedIndex: 0 });
  },

  setHighlightedIndex: (index) => {
    set({ highlightedIndex: index });
  },

  moveHighlightUp: () => {
    const { highlightedIndex } = get();
    if (highlightedIndex > 0) {
      set({ highlightedIndex: highlightedIndex - 1 });
    }
  },

  moveHighlightDown: (maxIndex) => {
    const { highlightedIndex } = get();
    if (highlightedIndex < maxIndex) {
      set({ highlightedIndex: highlightedIndex + 1 });
    }
  },

  selectByIndex: (index) => {
    // This is called when user presses 1-9
    // The actual selection logic is handled by the overlay component
    // This just sets the highlighted index
    set({ highlightedIndex: index });
  },
}));

/**
 * Category configuration with icons and labels
 */
export const MENTION_CATEGORY_CONFIG: Record<
  MentionCategory,
  {
    label: string;
    labelKey: string;
    shortcut: string;
    route: string;
  }
> = {
  clients: {
    label: "Clients",
    labelKey: "mentions.categories.clients",
    shortcut: "⌘⇧1",
    route: "/app/crm/clients",
  },
  properties: {
    label: "Properties",
    labelKey: "mentions.categories.properties",
    shortcut: "⌘⇧2",
    route: "/app/mls/properties",
  },
  documents: {
    label: "Documents",
    labelKey: "mentions.categories.documents",
    shortcut: "⌘⇧3",
    route: "/app/documents",
  },
};
