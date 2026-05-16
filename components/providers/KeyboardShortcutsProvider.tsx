"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useHotkeys, HotkeysProvider } from "react-hotkeys-hook";
import { useRouter, usePathname } from "next/navigation";
import {
  useKeyboardShortcuts,
  type ShortcutScope,
} from "@/hooks/use-keyboard-shortcuts";
import { useSidebar } from "@/components/ui/sidebar";

interface KeyboardShortcutsContextValue {
  /** Current active scope */
  activeScope: ShortcutScope;
  /** Set active scope */
  setScope: (scope: ShortcutScope) => void;
  /** Whether shortcuts are enabled */
  enabled: boolean;
  /** Enable/disable shortcuts */
  setEnabled: (enabled: boolean) => void;
  /** Open the help modal */
  openHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider"
    );
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

/**
 * Inner component that registers all global shortcuts
 */
function GlobalShortcutsHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    openHelpModal,
    addSequenceKey,
    clearSequence,
    getSequence,
    enabled,
    activeScope,
  } = useKeyboardShortcuts();

  // Try to get sidebar context (may not be available)
  let toggleSidebar: (() => void) | undefined;
  try {
    const sidebar = useSidebar();
    toggleSidebar = sidebar?.toggleSidebar;
  } catch {
    // Sidebar context not available
  }

  // Get locale from pathname
  const locale = pathname?.split("/")[1] || "en";

  // Handle sequence navigation
  const handleSequenceNavigation = useCallback(
    (sequence: string) => {
      switch (sequence) {
        // G+ navigation
        case "g d": router.push(`/${locale}/app`); break;
        case "g c": router.push(`/${locale}/app/crm/contacts`); break;
        case "g p": router.push(`/${locale}/app/mls/properties`); break;
        case "g m": router.push(`/${locale}/app/requests`); break;
        case "g l": router.push(`/${locale}/app/deals`); break;
        case "g e": router.push(`/${locale}/app/calendar`); break;
        case "g o": router.push(`/${locale}/app/documents`); break;
        case "g x": router.push(`/${locale}/app/matchmaking`); break;
        case "g s": router.push(`/${locale}/app/admin`); break;
        // N+ network navigation
        case "n f": router.push(`/${locale}/app/network/feed`); break;
        case "n m": router.push(`/${locale}/app/network/messages`); break;
        case "n s": router.push(`/${locale}/app/network/sharing-hub`); break;
        case "n a": router.push(`/${locale}/app/network`); break;
        case "n p": router.push(`/${locale}/app/network/profile`); break;
      }
      clearSequence();
    },
    [router, locale, clearSequence]
  );

  // CMD/CTRL + B - Toggle sidebar
  useHotkeys(
    "mod+b",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar?.();
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
      preventDefault: true,
    }
  );

  // CMD/CTRL + D - Override browser bookmark (Safari) - go to dashboard
  useHotkeys(
    "mod+d",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/${locale}/app`);
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
      preventDefault: true,
    }
  );

  // ? or Shift+/ or Shift+H - Show shortcuts help
  useHotkeys(
    "shift+/, shift+h",
    (e) => {
      e.preventDefault();
      openHelpModal();
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // G key - Start G+ navigation sequence
  useHotkeys(
    "g",
    () => { addSequenceKey("g"); },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // N key - Start N+ network sequence (or standalone upcoming if no prefix)
  useHotkeys(
    "n",
    () => {
      const sequence = getSequence();
      if (sequence === "") {
        addSequenceKey("n");
      }
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // U key - Upcoming (standalone)
  useHotkeys(
    "u",
    () => {
      const sequence = getSequence();
      if (sequence === "") {
        router.push(`/${locale}/app/upcoming`);
      }
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // D key - Dashboard (after G)
  useHotkeys(
    "d",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g d");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // C key - Contacts (after G)
  useHotkeys(
    "c",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g c");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // P key - Properties (after G)  /  Network Profile (after N)
  useHotkeys(
    "p",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g p");
      else if (sequence === "n") handleSequenceNavigation("n p");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // M key - Requests (after G)  /  Messages (after N)
  useHotkeys(
    "m",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g m");
      else if (sequence === "n") handleSequenceNavigation("n m");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // L key - Deals (after G)
  useHotkeys(
    "l",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g l");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // E key - Calendar (after G)
  useHotkeys(
    "e",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g e");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // O key - Documents (after G)
  useHotkeys(
    "o",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g o");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // X key - Matchmaking (after G)
  useHotkeys(
    "x",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g x");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // S key - Admin/Settings (after G)  /  Sharing Hub (after N)
  useHotkeys(
    "s",
    () => {
      const sequence = getSequence();
      if (sequence === "g") handleSequenceNavigation("g s");
      else if (sequence === "n") handleSequenceNavigation("n s");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // F key - Network Feed (after N)
  useHotkeys(
    "f",
    () => {
      const sequence = getSequence();
      if (sequence === "n") handleSequenceNavigation("n f");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // A key - Agents & Connections (after N)
  useHotkeys(
    "a",
    () => {
      const sequence = getSequence();
      if (sequence === "n") handleSequenceNavigation("n a");
    },
    { enabled: enabled && activeScope === "global", enableOnFormTags: false }
  );

  // Clear sequence on escape or after timeout
  useHotkeys(
    "escape",
    () => {
      clearSequence();
    },
    {
      enabled: enabled,
      enableOnFormTags: true,
    }
  );

  return null;
}

/**
 * Provider component that wraps the app with keyboard shortcuts functionality
 */
export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const {
    activeScope,
    setActiveScope,
    enabled,
    setEnabled,
    openHelpModal,
    helpModalOpen,
  } = useKeyboardShortcuts();

  // Disable shortcuts when help modal is open
  useEffect(() => {
    if (helpModalOpen) {
      setActiveScope("modal");
    } else {
      setActiveScope("global");
    }
  }, [helpModalOpen, setActiveScope]);

  const contextValue: KeyboardShortcutsContextValue = {
    activeScope,
    setScope: setActiveScope,
    enabled,
    setEnabled,
    openHelp: openHelpModal,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      <HotkeysProvider>
        <GlobalShortcutsHandler />
        {children}
      </HotkeysProvider>
    </KeyboardShortcutsContext.Provider>
  );
}

/**
 * Hook to register a component-specific shortcut scope
 */
export function useShortcutScope(scope: ShortcutScope) {
  const { setActiveScope } = useKeyboardShortcuts();

  useEffect(() => {
    setActiveScope(scope);
    return () => {
      setActiveScope("global");
    };
  }, [scope, setActiveScope]);
}
