"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider - Oikion Design System
 * 
 * Extended theme provider supporting themes:
 * - light: Clean, bright, crisp with cream → soft white → bright white hierarchy
 * - dark: Darker surfaces, not pure black, maintain readability
 * - pearl-sand: Warm pastel beige/taupe accent, darker easy-reading mode
 * - twilight-lavender: Muted violet/lavender accents, dark theme
 * 
 * Themes are persisted in localStorage and support system theme detection
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      themes={[
        "light",
        "dark",
        "pearl-sand",
        "twilight-lavender",
      ]}
      attribute="data-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
