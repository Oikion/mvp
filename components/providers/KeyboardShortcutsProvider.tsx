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
        case "g d":
          router.push(`/${locale}/app`);
          break;
        case "g c":
          router.push(`/${locale}/app/crm`);
          break;
        case "g p":
          router.push(`/${locale}/app/mls`);
          break;
        case "g e":
          router.push(`/${locale}/app/calendar`);
          break;
        case "g o":
          router.push(`/${locale}/app/documents`);
          break;
        case "g s":
          router.push(`/${locale}/app/admin/settings`);
          break;
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

  // G key - Start navigation sequence
  useHotkeys(
    "g",
    () => {
      addSequenceKey("g");
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // D key - Dashboard (after G)
  useHotkeys(
    "d",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g d");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // C key - CRM (after G)
  useHotkeys(
    "c",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g c");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // P key - Properties (after G)
  useHotkeys(
    "p",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g p");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // E key - Events/Calendar (after G)
  useHotkeys(
    "e",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g e");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // O key - Documents (after G)
  useHotkeys(
    "o",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g o");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
  );

  // S key - Settings (after G)
  useHotkeys(
    "s",
    () => {
      const sequence = getSequence();
      if (sequence === "g") {
        handleSequenceNavigation("g s");
      }
    },
    {
      enabled: enabled && activeScope === "global",
      enableOnFormTags: false,
    }
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
