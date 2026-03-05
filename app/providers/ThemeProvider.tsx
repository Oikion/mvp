"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const THEME_STORAGE_KEY = "oikion-theme";
const THEMES = ["light", "dark", "estate", "estate-dark", "twilight-lavender"] as const;

/**
 * ThemeProvider - Oikion Design System
 * 
 * Extended theme provider supporting themes:
 * - light: Clean, bright, crisp with cream → soft white → bright white hierarchy
 * - dark: Darker surfaces, not pure black, maintain readability
 * - estate: Pine Charcoal + Sage Green, earthy brand theme
 * - estate-dark: Dark pine forest variant
 * - twilight-lavender: Muted violet/lavender accents, dark theme
 * 
 * Themes are persisted in localStorage and support system theme detection.
 * 
 * Note: next-themes handles flash prevention via its own injected script.
 * Do not add module-level DOM manipulation as it causes hydration mismatches.
 */
// Migrate old localStorage theme values before next-themes reads them.
// Runs synchronously in the component body so NextThemesProvider sees the
// updated value when it initialises.
const THEME_MIGRATIONS: Record<string, string> = {
  "oikion": "estate",
  "oikion-dark": "estate-dark",
};

function migrateStoredTheme() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && THEME_MIGRATIONS[stored]) {
    localStorage.setItem(THEME_STORAGE_KEY, THEME_MIGRATIONS[stored]);
  }
}

export function ThemeProvider({
  children,
  ...props
}: Readonly<React.ComponentProps<typeof NextThemesProvider>>) {
  migrateStoredTheme();

  return (
    <NextThemesProvider
      {...props}
      themes={[...THEMES]}
      attribute="data-theme"
      disableTransitionOnChange
      enableColorScheme={false}
      storageKey={THEME_STORAGE_KEY}
      enableSystem={props.enableSystem ?? true}
      defaultTheme={props.defaultTheme ?? "system"}
    >
      {children}
    </NextThemesProvider>
  );
}
