"use client";

import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { KeyboardShortcutsModal } from "@/components/modals/KeyboardShortcutsModal";
import { AriaLiveProvider } from "@/components/ui/aria-live";
import { LayoutPreferenceProvider, LayoutPreferenceValue } from "@/lib/layout-preference";

interface AppProvidersProps {
  children: React.ReactNode;
  initialLayoutPreference?: LayoutPreferenceValue;
}

/**
 * Client-side providers wrapper for the app
 * Includes:
 * - Keyboard shortcuts system
 * - ARIA live region for screen reader announcements
 * - Layout preference system (centered/wide)
 * - Other client-only providers
 */
export function AppProviders({ 
  children, 
  initialLayoutPreference = "DEFAULT" 
}: Readonly<AppProvidersProps>) {
  return (
    <AriaLiveProvider>
      <LayoutPreferenceProvider initialLayout={initialLayoutPreference}>
        <KeyboardShortcutsProvider>
          {children}
          <KeyboardShortcutsModal />
        </KeyboardShortcutsProvider>
      </LayoutPreferenceProvider>
    </AriaLiveProvider>
  );
}
