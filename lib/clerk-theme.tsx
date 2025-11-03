"use client";

import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { useEffect, useState } from "react";

/**
 * Convert HSL string to hex color for Clerk
 * HSL format: "h s% l%" -> "#rrggbb"
 */
function hslToHex(hsl: string): string {
  const regex = /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/;
  const match = regex.exec(hsl);
  if (!match) return "#000000";
  
  const h = Number.parseFloat(match[1]) / 360;
  const s = Number.parseFloat(match[2]) / 100;
  const l = Number.parseFloat(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get HSL value from CSS variable (returns raw HSL string like "h s% l%")
 */
function getHSLValueRaw(varName: string): string {
  if (globalThis.window === undefined) return "";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value;
}

/**
 * Get HSL value from CSS variable and format it for Clerk
 * CSS variable format: "h s% l%" -> Clerk format: "hsl(h, s%, l%)"
 */
function getHSLValue(varName: string): string {
  const raw = getHSLValueRaw(varName);
  if (!raw) return "";
  // Value is already in format "h s% l%", wrap it in hsl()
  return `hsl(${raw})`;
}

/**
 * Get theme-specific Clerk variables
 * Includes all necessary Clerk appearance variables for proper theming
 */
function getThemeVariables(theme: string): Record<string, string> {
  const getVar = (name: string) => getHSLValue(name);
  const getColor = (name: string) => {
    const hsl = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return hsl ? hslToHex(hsl) : undefined;
  };

  // Base variables that are common across themes
  const baseVars = {
    colorSuccess: getVar("--success") || "hsl(142, 71%, 45%)",
    colorDanger: getVar("--error") || "hsl(0, 84.2%, 60.2%)",
    colorWarning: getVar("--warning") || "hsl(38, 92%, 50%)",
    borderRadius: "0.5rem",
  };

  switch (theme) {
    case "light":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#1a1a1a",
        colorBackground: getVar("--surface-3") || getVar("--card") || "#ffffff",
        colorText: getVar("--foreground") || "hsl(0, 0%, 3.9%)", // Dark text for light theme
        colorTextSecondary: getVar("--text-secondary") || "hsl(0, 0%, 45.1%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "#ffffff",
        colorInputText: getVar("--foreground") || "hsl(0, 0%, 3.9%)", // Dark text for inputs
        colorInputBorder: getVar("--border") || "hsl(0, 0%, 89.8%)",
        colorNeutral: getVar("--muted") || "hsl(0, 0%, 96.1%)",
        colorAlphaShade: getVar("--muted") || "hsl(0, 0%, 96.1%)",
        colorShimmer: "rgba(0, 0, 0, 0.05)",
        colorBorder: getVar("--border") || "hsl(0, 0%, 89.8%)",
      };

    case "dark":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#2243db",
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(0, 0%, 14.9%)",
        colorText: getVar("--foreground") || "hsl(0, 0%, 98%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(0, 0%, 63.9%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "hsl(0, 0%, 14.9%)",
        colorInputText: getVar("--foreground") || "hsl(0, 0%, 98%)",
        colorInputBorder: getVar("--border") || "hsl(0, 0%, 27.3%)",
        colorNeutral: getVar("--muted") || "hsl(0, 0%, 14.9%)",
        colorAlphaShade: getVar("--muted") || "hsl(0, 0%, 14.9%)",
        colorShimmer: "rgba(255, 255, 255, 0.05)",
        colorBorder: getVar("--border") || "hsl(0, 0%, 27.3%)",
      };

    case "pearl-sand":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#6b5d4f",
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(30, 18%, 85%)",
        colorText: getVar("--foreground") || "hsl(30, 10%, 15%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(30, 10%, 50%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "#ffffff",
        colorInputText: getVar("--foreground") || "hsl(30, 10%, 15%)",
        colorInputBorder: getVar("--border") || "hsl(30, 12%, 75%)",
        colorNeutral: getVar("--muted") || "hsl(30, 15%, 82%)",
        colorAlphaShade: getVar("--muted") || "hsl(30, 15%, 82%)",
        colorShimmer: "rgba(0, 0, 0, 0.03)",
        colorBorder: getVar("--border") || "hsl(30, 12%, 75%)",
      };

    case "twilight-lavender":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#9d7cd8",
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(270, 12%, 10%)",
        colorText: getVar("--foreground") || "hsl(270, 10%, 95%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(270, 10%, 65%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "hsl(270, 12%, 20%)",
        colorInputText: getVar("--foreground") || "hsl(270, 10%, 95%)",
        colorInputBorder: getVar("--border") || "hsl(270, 12%, 20%)",
        colorNeutral: getVar("--muted") || "hsl(270, 12%, 15%)",
        colorAlphaShade: getVar("--muted") || "hsl(270, 12%, 15%)",
        colorShimmer: "rgba(255, 255, 255, 0.05)",
        colorBorder: getVar("--border") || "hsl(270, 12%, 20%)",
      };

    default:
      return {
        ...baseVars,
        colorPrimary: "#1a1a1a",
        colorBackground: "#ffffff",
        colorText: "#0a0a0a",
        colorTextSecondary: "#737373",
        colorInputBackground: "#ffffff",
        colorInputText: "#0a0a0a",
        colorInputBorder: "#e5e5e5",
        colorNeutral: "#f5f5f5",
        colorAlphaShade: "#f5f5f5",
        colorShimmer: "rgba(0, 0, 0, 0.05)",
        colorBorder: "#e5e5e5",
      };
  }
}

/**
 * Create Clerk appearance object based on current theme
 */
function createClerkAppearance(theme: string | undefined): any {
  const variables = getThemeVariables(theme || "light");
  const isDarkTheme = theme === "dark" || theme === "twilight-lavender";

  // Use surface-3 (top layer/cards) for Clerk component backgrounds
  // Ensure we get actual values, not empty strings
  const surface3 = getHSLValueRaw("--surface-3");
  const card = getHSLValueRaw("--card");
  const cardBg = surface3 
    ? `hsl(${surface3})` 
    : card 
    ? `hsl(${card})` 
    : variables.colorBackground;
  
  // Ensure we have valid colors - if CSS variables aren't loaded, use theme defaults
  const cardForeground = getHSLValueRaw("--card-foreground");
  const foreground = getHSLValueRaw("--foreground");
  const cardFg = cardForeground
    ? `hsl(${cardForeground})`
    : foreground
    ? `hsl(${foreground})`
    : variables.colorText || (theme === "light" ? "hsl(0, 0%, 3.9%)" : theme === "dark" || theme === "twilight-lavender" ? "hsl(0, 0%, 98%)" : "hsl(30, 10%, 15%)"); // Explicit fallback
  
  const textSecondaryVar = getHSLValueRaw("--text-secondary");
  const textSecondary = textSecondaryVar
    ? `hsl(${textSecondaryVar})`
    : variables.colorTextSecondary;
  
  const border = getHSLValueRaw("--border");
  const borderColor = border
    ? `hsl(${border})`
    : variables.colorBorder;

  // Update variables to use surface-3 for background and ensure proper text colors
  const updatedVariables = {
    ...variables,
    colorBackground: cardBg, // Use card/surface-3 background for Clerk components
    colorText: cardFg, // Ensure text color matches card foreground - CRITICAL for visibility
    colorTextSecondary: textSecondary, // Ensure secondary text color is set
  };

  // Get button colors for proper styling - using standard theme colors
  const buttonPrimary = getHSLValueRaw("--primary")
    ? `hsl(${getHSLValueRaw("--primary")})`
    : variables.colorPrimary;
  const buttonPrimaryFg = getHSLValueRaw("--primary-foreground")
    ? `hsl(${getHSLValueRaw("--primary-foreground")})`
    : cardFg;
  const buttonSecondary = getHSLValueRaw("--secondary")
    ? `hsl(${getHSLValueRaw("--secondary")})`
    : variables.colorNeutral;
  const buttonSecondaryFg = getHSLValueRaw("--secondary-foreground")
    ? `hsl(${getHSLValueRaw("--secondary-foreground")})`
    : cardFg;
  const buttonDestructive = getHSLValueRaw("--destructive")
    ? `hsl(${getHSLValueRaw("--destructive")})`
    : variables.colorDanger;
  const buttonDestructiveFg = getHSLValueRaw("--destructive-foreground")
    ? `hsl(${getHSLValueRaw("--destructive-foreground")})`
    : "#ffffff";

  // Get surface-2 for popover background (matches our popover component)
  const surface2 = getHSLValueRaw("--surface-2");
  const popoverBg = surface2 
    ? `hsl(${surface2})` 
    : cardBg;
  
  // Get accent color for ghost button hover
  const accent = getHSLValueRaw("--accent")
    ? `hsl(${getHSLValueRaw("--accent")})`
    : variables.colorNeutral;

  return {
    ...(isDarkTheme && { baseTheme: dark }),
    variables: updatedVariables,
    elements: {
      rootBox: {
        backgroundColor: cardBg,
        color: cardFg,
      },
      card: {
        backgroundColor: cardBg,
        color: cardFg,
        borderColor: borderColor,
      },
      cardBox: {
        backgroundColor: cardBg,
        color: cardFg,
        borderColor: borderColor,
      },
      modalContent: {
        backgroundColor: cardBg,
        color: cardFg,
      },
      modalContentBox: {
        backgroundColor: cardBg,
        color: cardFg,
      },
      // Popover styling - matches our design system (surface-2, elevation-2)
      organizationSwitcherPopoverCard: {
        backgroundColor: popoverBg,
        color: cardFg,
        borderColor: borderColor,
        borderRadius: "0.5rem",
        boxShadow: isDarkTheme 
          ? "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
      },
      // Create organization button - styled as primary button
      // Note: Hover states and margins are handled via CSS in globals.css for better control
      organizationSwitcherPopoverActionButton: {
        backgroundColor: buttonPrimary,
        color: buttonPrimaryFg,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        marginTop: "0.5rem",
        marginBottom: "0.5rem",
        marginLeft: "0.75rem",
        marginRight: "0.75rem",
      },
      organizationSwitcherPopoverActionButtonText: {
        color: buttonPrimaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Manage button - styled as ghost button
      organizationSwitcherPopoverManageButton: {
        backgroundColor: "transparent",
        color: cardFg,
        borderRadius: "0.375rem",
        padding: "0.5rem 0.75rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      organizationSwitcherPopoverManageButtonText: {
        color: cardFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Destructive actions (delete, leave) - styled as destructive button
      organizationSwitcherPopoverDestructiveButton: {
        backgroundColor: buttonDestructive,
        color: buttonDestructiveFg,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      organizationSwitcherPopoverDestructiveButtonText: {
        color: buttonDestructiveFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Organization switcher trigger - add margins so it doesn't stick to sides
      organizationSwitcherTrigger: {
        color: cardFg,
        backgroundColor: "transparent",
        marginLeft: "0.5rem",
        marginRight: "0.5rem",
        padding: "0.5rem",
      },
      organizationPreview: {
        backgroundColor: "transparent",
        color: cardFg,
      },
      organizationPreviewMainIdentifier: {
        color: cardFg,
        fontWeight: "600",
      },
      organizationPreviewSecondaryIdentifier: {
        color: textSecondary,
      },
      organizationSwitcherPopoverFooter: {
        backgroundColor: popoverBg,
        color: textSecondary,
        borderTop: `1px solid ${borderColor}`,
      },
      organizationSwitcherPopoverFooterText: {
        color: textSecondary,
      },
      organizationSwitcherPopoverFooterAction: {
        color: textSecondary,
      },
      organizationSwitcherPopoverFooterActionText: {
        color: textSecondary,
      },
      badge: {
        backgroundColor: cardBg,
        color: cardFg,
      },
      text: {
        color: cardFg,
      },
      formFieldLabel: {
        color: cardFg,
      },
      formFieldInput: {
        backgroundColor: variables.colorInputBackground,
        color: variables.colorInputText,
        borderColor: variables.colorInputBorder,
      },
      // Clerk uses these class names for text elements
      organizationSwitcherPopoverActionButton__text: {
        color: buttonSecondaryFg,
      },
      organizationSwitcherPopoverActionButtonText__text: {
        color: buttonSecondaryFg,
      },
      organizationPreviewMainIdentifier__text: {
        color: cardFg,
      },
      organizationPreviewSecondaryIdentifier__text: {
        color: textSecondary,
      },
      organizationSwitcherPopoverFooterText__text: {
        color: textSecondary,
      },
      organizationSwitcherPopoverFooterActionText__text: {
        color: textSecondary,
      },
      // General text styling
      organizationSwitcherPopoverActionButtonText__text__primary: {
        color: buttonSecondaryFg,
      },
      organizationSwitcherPopoverActionButtonText__text__secondary: {
        color: textSecondary,
      },
      // Social buttons - styled as secondary buttons
      socialButtonsBlockButton: {
        backgroundColor: buttonSecondary,
        color: buttonSecondaryFg,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButtonsBlockButtonText: {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButton: {
        backgroundColor: buttonSecondary,
        color: buttonSecondaryFg,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      socialButtonText: {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButtonIcon: {
        color: buttonSecondaryFg,
      },
      // All social button text variants
      "socialButtonsBlockButtonText__google": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__github": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__microsoft": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__apple": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__facebook": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__discord": {
        color: buttonSecondaryFg,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
    },
  };
}

export function useClerkTheme() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [appearance, setAppearance] = useState<any>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Use resolvedTheme to handle "system" theme
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    
    // Increased delay to ensure CSS variables are fully applied
    // Also force a re-render to ensure CSS variables are read correctly
    const timer = setTimeout(() => {
      setAppearance(createClerkAppearance(currentTheme));
    }, 150);

    return () => clearTimeout(timer);
  }, [theme, resolvedTheme, mounted]);

  return {
    appearance,
    mounted,
  };
}

