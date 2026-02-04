"use client";

import { create } from "zustand";

/**
 * Shortcut scopes - determines when shortcuts are active
 */
export type ShortcutScope = "global" | "table" | "modal" | "search";

/**
 * Platform-aware modifier key
 */
export type ModifierKey = "mod" | "ctrl" | "alt" | "shift" | "meta";

/**
 * Shortcut category for grouping in help modal
 */
export type ShortcutCategory = 
  | "navigation" 
  | "actions" 
  | "table" 
  | "search" 
  | "general";

/**
 * Definition of a keyboard shortcut
 */
export interface ShortcutDefinition {
  /** Unique identifier for this shortcut */
  id: string;
  /** Display label for help modal */
  label: string;
  /** Key combination (e.g., "mod+k", "g d", "shift+backspace") */
  keys: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Scopes where this shortcut is active */
  scopes: ShortcutScope[];
  /** Description for help modal */
  description?: string;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
}

/**
 * State for keyboard shortcuts store
 */
interface KeyboardShortcutsState {
  /** All registered shortcuts */
  shortcuts: Map<string, ShortcutDefinition>;
  /** Current active scope */
  activeScope: ShortcutScope;
  /** Whether the help modal is open */
  helpModalOpen: boolean;
  /** Whether shortcuts are globally enabled */
  enabled: boolean;
  /** Sequence state for multi-key shortcuts like "g d" */
  sequenceKeys: string[];
  /** Timer for sequence timeout */
  sequenceTimeout: ReturnType<typeof setTimeout> | null;

  // Actions
  registerShortcut: (shortcut: ShortcutDefinition) => void;
  unregisterShortcut: (id: string) => void;
  setActiveScope: (scope: ShortcutScope) => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  toggleHelpModal: () => void;
  setEnabled: (enabled: boolean) => void;
  getShortcutsByCategory: () => Record<ShortcutCategory, ShortcutDefinition[]>;
  getShortcutsByScope: (scope: ShortcutScope) => ShortcutDefinition[];
  isShortcutActive: (id: string) => boolean;
  
  // Sequence handling
  addSequenceKey: (key: string) => void;
  clearSequence: () => void;
  getSequence: () => string;
}

/**
 * Default shortcuts that are always registered
 */
const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "global-search",
    label: "Global Search",
    keys: "mod+k",
    category: "search",
    scopes: ["global"],
    description: "Open the global search overlay",
  },
  {
    id: "toggle-sidebar",
    label: "Toggle Sidebar",
    keys: "mod+b",
    category: "navigation",
    scopes: ["global"],
    description: "Toggle the sidebar visibility",
  },
  {
    id: "go-dashboard-direct",
    label: "Go to Dashboard",
    keys: "mod+d",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate directly to Dashboard",
  },
  {
    id: "show-shortcuts",
    label: "Show Shortcuts",
    keys: "shift+h",
    category: "general",
    scopes: ["global"],
    description: "Show keyboard shortcuts help (also ? or Shift+/)",
  },
  {
    id: "close-modal",
    label: "Close / Cancel",
    keys: "escape",
    category: "general",
    scopes: ["global", "modal", "search"],
    description: "Close modal or cancel current action",
  },
  // Navigation shortcuts (G + key sequences)
  {
    id: "go-dashboard",
    label: "Go to Dashboard",
    keys: "g d",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to Dashboard (/app)",
  },
  {
    id: "go-crm",
    label: "Go to CRM",
    keys: "g c",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to CRM / Clients",
  },
  {
    id: "go-properties",
    label: "Go to Properties",
    keys: "g p",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to Properties / MLS",
  },
  {
    id: "go-calendar",
    label: "Go to Calendar",
    keys: "g e",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to Calendar / Events",
  },
  {
    id: "go-documents",
    label: "Go to Documents",
    keys: "g o",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to Documents",
  },
  {
    id: "go-settings",
    label: "Go to Settings",
    keys: "g s",
    category: "navigation",
    scopes: ["global"],
    description: "Navigate to Settings",
  },
  {
    id: "new-entity",
    label: "New Entity",
    keys: "n",
    category: "actions",
    scopes: ["global"],
    description: "Create new entity (context-aware)",
  },
  // Table shortcuts
  {
    id: "table-next-row",
    label: "Next Row",
    keys: "j",
    category: "table",
    scopes: ["table"],
    description: "Select next row in table",
  },
  {
    id: "table-prev-row",
    label: "Previous Row",
    keys: "k",
    category: "table",
    scopes: ["table"],
    description: "Select previous row in table",
  },
  {
    id: "table-open",
    label: "Open / View",
    keys: "enter",
    category: "table",
    scopes: ["table"],
    description: "Open selected row",
  },
  {
    id: "table-edit",
    label: "Edit",
    keys: "e",
    category: "table",
    scopes: ["table"],
    description: "Edit selected row",
  },
  {
    id: "table-delete",
    label: "Delete",
    keys: "mod+backspace",
    category: "table",
    scopes: ["table"],
    description: "Delete selected row(s)",
  },
  {
    id: "table-toggle-select",
    label: "Toggle Selection",
    keys: "x",
    category: "table",
    scopes: ["table"],
    description: "Toggle row selection",
  },
  {
    id: "table-select-all",
    label: "Select All",
    keys: "mod+a",
    category: "table",
    scopes: ["table"],
    description: "Select all rows",
  },
  {
    id: "table-clear-selection",
    label: "Clear Selection",
    keys: "escape",
    category: "table",
    scopes: ["table"],
    description: "Clear all selections",
  },
];

// Sequence timeout in milliseconds
const SEQUENCE_TIMEOUT = 1000;

/**
 * Zustand store for managing keyboard shortcuts
 */
export const useKeyboardShortcuts = create<KeyboardShortcutsState>((set, get) => {
  // Initialize with default shortcuts
  const initialShortcuts = new Map<string, ShortcutDefinition>();
  DEFAULT_SHORTCUTS.forEach((shortcut) => {
    initialShortcuts.set(shortcut.id, shortcut);
  });

  return {
    shortcuts: initialShortcuts,
    activeScope: "global",
    helpModalOpen: false,
    enabled: true,
    sequenceKeys: [],
    sequenceTimeout: null,

    registerShortcut: (shortcut) => {
      set((state) => {
        const newShortcuts = new Map(state.shortcuts);
        newShortcuts.set(shortcut.id, shortcut);
        return { shortcuts: newShortcuts };
      });
    },

    unregisterShortcut: (id) => {
      set((state) => {
        const newShortcuts = new Map(state.shortcuts);
        newShortcuts.delete(id);
        return { shortcuts: newShortcuts };
      });
    },

    setActiveScope: (scope) => {
      set({ activeScope: scope });
    },

    openHelpModal: () => {
      set({ helpModalOpen: true });
    },

    closeHelpModal: () => {
      set({ helpModalOpen: false });
    },

    toggleHelpModal: () => {
      set((state) => ({ helpModalOpen: !state.helpModalOpen }));
    },

    setEnabled: (enabled) => {
      set({ enabled });
    },

    getShortcutsByCategory: () => {
      const { shortcuts } = get();
      const grouped: Record<ShortcutCategory, ShortcutDefinition[]> = {
        navigation: [],
        actions: [],
        table: [],
        search: [],
        general: [],
      };

      shortcuts.forEach((shortcut) => {
        if (shortcut.enabled !== false) {
          grouped[shortcut.category].push(shortcut);
        }
      });

      return grouped;
    },

    getShortcutsByScope: (scope) => {
      const { shortcuts } = get();
      const filtered: ShortcutDefinition[] = [];

      shortcuts.forEach((shortcut) => {
        if (shortcut.scopes.includes(scope) && shortcut.enabled !== false) {
          filtered.push(shortcut);
        }
      });

      return filtered;
    },

    isShortcutActive: (id) => {
      const { shortcuts, activeScope, enabled } = get();
      if (!enabled) return false;

      const shortcut = shortcuts.get(id);
      if (!shortcut || shortcut.enabled === false) return false;

      return shortcut.scopes.includes(activeScope) || shortcut.scopes.includes("global");
    },

    addSequenceKey: (key) => {
      const { sequenceTimeout } = get();
      
      // Clear existing timeout
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }

      // Add key to sequence
      set((state) => ({
        sequenceKeys: [...state.sequenceKeys, key],
        sequenceTimeout: setTimeout(() => {
          get().clearSequence();
        }, SEQUENCE_TIMEOUT),
      }));
    },

    clearSequence: () => {
      const { sequenceTimeout } = get();
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }
      set({ sequenceKeys: [], sequenceTimeout: null });
    },

    getSequence: () => {
      return get().sequenceKeys.join(" ");
    },
  };
});

/**
 * Helper to detect platform (Mac vs Windows/Linux)
 */
export function isMac(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Format a shortcut key for display
 * Converts "mod" to ⌘ on Mac and Ctrl on Windows
 */
export function formatShortcutKey(keys: string): string {
  const mac = isMac();
  
  return keys
    .split("+")
    .map((key) => {
      switch (key.toLowerCase()) {
        case "mod":
          return mac ? "⌘" : "Ctrl";
        case "ctrl":
          return mac ? "⌃" : "Ctrl";
        case "alt":
          return mac ? "⌥" : "Alt";
        case "shift":
          return mac ? "⇧" : "Shift";
        case "meta":
          return mac ? "⌘" : "Win";
        case "enter":
          return "↵";
        case "escape":
          return "Esc";
        case "backspace":
          return mac ? "⌫" : "Backspace";
        case "arrowup":
          return "↑";
        case "arrowdown":
          return "↓";
        case "arrowleft":
          return "←";
        case "arrowright":
          return "→";
        default:
          return key.toUpperCase();
      }
    })
    .join(mac ? "" : "+");
}

/**
 * Format a sequence shortcut for display (e.g., "g d" -> "G then D")
 */
export function formatSequenceShortcut(keys: string): string {
  if (!keys.includes(" ")) {
    return formatShortcutKey(keys);
  }

  return keys
    .split(" ")
    .map((k) => formatShortcutKey(k))
    .join(" then ");
}

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: "Navigation",
  actions: "Actions",
  table: "Table",
  search: "Search",
  general: "General",
};
