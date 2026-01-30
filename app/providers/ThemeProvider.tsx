"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const THEME_STORAGE_KEY = "oikion-theme";
const THEMES = ["light", "dark", "pearl-sand", "twilight-lavender"] as const;

/**
 * ThemeProvider - Oikion Design System
 * 
 * Extended theme provider supporting themes:
 * - light: Clean, bright, crisp with cream → soft white → bright white hierarchy
 * - dark: Darker surfaces, not pure black, maintain readability
 * - pearl-sand: Warm pastel beige/taupe accent, darker easy-reading mode
 * - twilight-lavender: Muted violet/lavender accents, dark theme
 * 
 * Themes are persisted in localStorage and support system theme detection.
 * 
 * Note: next-themes handles flash prevention via its own injected script.
 * Do not add module-level DOM manipulation as it causes hydration mismatches.
 */
export function ThemeProvider({
  children,
  ...props
}: Readonly<React.ComponentProps<typeof NextThemesProvider>>) {
  return (
    <NextThemesProvider
      {...props}
      themes={[...THEMES]}
      attribute="data-theme"
      disableTransitionOnChange
      enableColorScheme={false}
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
