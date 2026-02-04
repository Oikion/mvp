"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";

/**
 * Get Tremor color name based on theme
 * Tremor accepts named colors like "blue", "emerald", "amber", "violet", "rose", etc.
 */
function getTremorColorForTheme(theme: string | undefined): string {
  switch (theme) {
    case "dark":
      return "blue"; // Blue works well on dark backgrounds
    case "pearl-sand":
      return "amber"; // Warm amber matches beige/taupe theme
    case "twilight-lavender":
      return "violet"; // Violet matches lavender theme
    case "light":
    default:
      return "blue"; // Blue for light theme
  }
}

/**
 * Hook to get theme-aware chart colors
 * Returns Tremor-compatible color names that match the current theme
 */
export function useChartColors() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartColors = useMemo(() => {
    if (!mounted) {
      // Return default colors during SSR
      return {
        primary: "blue",
        secondary: "emerald",
        accent: "amber",
        tertiary: "violet",
        quaternary: "rose",
        colors: ["blue"],
      };
    }

    const currentTheme = theme === "system" ? systemTheme : theme;
    const primaryColor = getTremorColorForTheme(currentTheme);

    // Map theme to appropriate Tremor color palette
    const colorMap: Record<string, string[]> = {
      light: ["blue", "emerald", "amber", "violet", "rose"],
      dark: ["blue", "cyan", "amber", "violet", "rose"],
      "pearl-sand": ["amber", "orange", "yellow", "rose", "emerald"],
      "twilight-lavender": ["violet", "purple", "fuchsia", "blue", "rose"],
    };

    const colors = colorMap[currentTheme || "light"] || colorMap.light;

    return {
      primary: colors[0],
      secondary: colors[1],
      accent: colors[2],
      tertiary: colors[3],
      quaternary: colors[4],
      // Array form for easy use in Tremor charts
      colors: [colors[0]], // Use primary color for single-series charts
      allColors: colors, // All colors for multi-series charts
    };
  }, [theme, systemTheme, mounted]);

  return chartColors;
}

