"use client";

import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { KeyboardShortcutsModal } from "@/components/modals/KeyboardShortcutsModal";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper for the app
 * Includes keyboard shortcuts and other client-only providers
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <KeyboardShortcutsProvider>
      {children}
      <KeyboardShortcutsModal />
    </KeyboardShortcutsProvider>
  );
}
