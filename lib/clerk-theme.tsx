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
 * Calculate relative luminance for contrast checking
 * Returns a value between 0 (black) and 1 (white)
 */
function getLuminance(hex: string): number {
  const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.slice(1).map((x) => {
    const val = Number.parseInt(x, 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure text color has sufficient contrast against background
 * Returns a color that meets WCAG AA standards (4.5:1 for normal text)
 */
function ensureContrast(textColor: string, backgroundColor: string, minRatio: number = 4.5): string {
  const ratio = getContrastRatio(textColor, backgroundColor);
  if (ratio >= minRatio) return textColor;
  
  // If contrast is insufficient, adjust the text color
  // For light backgrounds, use darker text; for dark backgrounds, use lighter text
  const bgLum = getLuminance(backgroundColor);
  const isLightBg = bgLum > 0.5;
  
  // Return high-contrast colors
  return isLightBg ? "#000000" : "#ffffff";
}

/**
 * Get theme-specific Clerk variables with improved contrast
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
        colorText: getVar("--foreground") || "hsl(0, 0%, 3.9%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(0, 0%, 45.1%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "#ffffff",
        colorInputText: getVar("--foreground") || "hsl(0, 0%, 3.9%)",
        colorInputBorder: getVar("--border") || "hsl(0, 0%, 89.8%)",
        colorNeutral: getVar("--muted") || "hsl(0, 0%, 96.1%)",
        colorAlphaShade: getVar("--muted") || "hsl(0, 0%, 96.1%)",
        colorShimmer: "rgba(0, 0, 0, 0.05)",
        colorBorder: getVar("--border") || "hsl(0, 0%, 89.8%)",
      };

    case "dark":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#ffffff",
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(0, 0%, 14.9%)",
        colorText: getVar("--foreground") || "hsl(0, 0%, 98%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(0, 0%, 70%)",
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
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(35, 15%, 97%)",
        colorText: getVar("--foreground") || "hsl(30, 10%, 20%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(30, 10%, 45%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "#ffffff",
        colorInputText: getVar("--foreground") || "hsl(30, 10%, 20%)",
        colorInputBorder: getVar("--border") || "hsl(35, 15%, 75%)",
        colorNeutral: getVar("--muted") || "hsl(35, 10%, 92%)",
        colorAlphaShade: getVar("--muted") || "hsl(35, 10%, 92%)",
        colorShimmer: "rgba(0, 0, 0, 0.03)",
        colorBorder: getVar("--border") || "hsl(35, 15%, 75%)",
      };

    case "twilight-lavender":
      return {
        ...baseVars,
        colorPrimary: getColor("--primary") || "#9d7cd8",
        colorBackground: getVar("--surface-3") || getVar("--card") || "hsl(265, 20%, 14%)",
        colorText: getVar("--foreground") || "hsl(260, 20%, 98%)",
        colorTextSecondary: getVar("--text-secondary") || "hsl(265, 20%, 75%)",
        colorInputBackground: getVar("--input") || getVar("--surface-3") || "hsl(265, 20%, 20%)",
        colorInputText: getVar("--foreground") || "hsl(260, 20%, 98%)",
        colorInputBorder: getVar("--border") || "hsl(265, 20%, 30%)",
        colorNeutral: getVar("--muted") || "hsl(265, 20%, 20%)",
        colorAlphaShade: getVar("--muted") || "hsl(265, 20%, 20%)",
        colorShimmer: "rgba(255, 255, 255, 0.05)",
        colorBorder: getVar("--border") || "hsl(265, 20%, 30%)",
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
 * Create Clerk appearance object based on current theme with improved contrast
 */
function createClerkAppearance(theme: string | undefined): any {
  const variables = getThemeVariables(theme || "light");
  const isDarkTheme = theme === "dark" || theme === "twilight-lavender";

  // Get background colors
  const surface3 = getHSLValueRaw("--surface-3");
  const card = getHSLValueRaw("--card");
  const cardBg = surface3 
    ? `hsl(${surface3})` 
    : card 
    ? `hsl(${card})` 
    : variables.colorBackground;
  
  // Get text colors with contrast checking
  const cardForeground = getHSLValueRaw("--card-foreground");
  const foreground = getHSLValueRaw("--foreground");
  const cardFgRaw = cardForeground || foreground || "";
  const cardFg = cardFgRaw
    ? `hsl(${cardFgRaw})`
    : variables.colorText;
  
  // Ensure text has sufficient contrast
  const cardBgRaw = surface3 || card || "";
  const cardBgHex = cardBgRaw ? hslToHex(cardBgRaw) : (isDarkTheme ? "#1f1f1f" : "#ffffff");
  const cardFgHex = cardFgRaw ? hslToHex(cardFgRaw) : (isDarkTheme ? "#fafafa" : "#0a0a0a");
  const cardFgContrast = ensureContrast(cardFgHex, cardBgHex);
  const cardFgFinal = cardFgContrast !== cardFgHex ? cardFgContrast : cardFg;
  
  const textSecondaryVar = getHSLValueRaw("--text-secondary");
  const textSecondaryRaw = textSecondaryVar || "";
  const textSecondary = textSecondaryRaw
    ? `hsl(${textSecondaryRaw})`
    : variables.colorTextSecondary;
  
  // Ensure borders are visible
  const border = getHSLValueRaw("--border");
  const borderColor = border
    ? `hsl(${border})`
    : variables.colorBorder;

  // Update variables with contrast-corrected colors
  const updatedVariables = {
    ...variables,
    colorBackground: cardBg,
    colorText: cardFgFinal,
    colorTextSecondary: textSecondary,
  };

  // Get button colors with proper contrast
  const buttonPrimaryRaw = getHSLValueRaw("--primary");
  const buttonPrimary = buttonPrimaryRaw
    ? `hsl(${buttonPrimaryRaw})`
    : variables.colorPrimary;
  const buttonPrimaryHex = buttonPrimaryRaw ? hslToHex(buttonPrimaryRaw) : (isDarkTheme ? "#fafafa" : "#1a1a1a");
  
  const buttonPrimaryFgRaw = getHSLValueRaw("--primary-foreground");
  const buttonPrimaryFg = buttonPrimaryFgRaw
    ? `hsl(${buttonPrimaryFgRaw})`
    : cardFgFinal;
  const buttonPrimaryFgHex = buttonPrimaryFgRaw ? hslToHex(buttonPrimaryFgRaw) : (isDarkTheme ? "#0a0a0a" : "#fafafa");
  
  // Ensure button text has sufficient contrast
  const buttonPrimaryFgContrast = ensureContrast(buttonPrimaryFgHex, buttonPrimaryHex, 4.5);
  const buttonPrimaryFgFinal = buttonPrimaryFgContrast !== buttonPrimaryFgHex 
    ? buttonPrimaryFgContrast 
    : buttonPrimaryFg;
  
  const buttonSecondaryRaw = getHSLValueRaw("--secondary");
  const buttonSecondary = buttonSecondaryRaw
    ? `hsl(${buttonSecondaryRaw})`
    : variables.colorNeutral;
  const buttonSecondaryHex = buttonSecondaryRaw ? hslToHex(buttonSecondaryRaw) : (isDarkTheme ? "#262626" : "#f5f5f5");
  
  const buttonSecondaryFgRaw = getHSLValueRaw("--secondary-foreground");
  const buttonSecondaryFg = buttonSecondaryFgRaw
    ? `hsl(${buttonSecondaryFgRaw})`
    : cardFgFinal;
  const buttonSecondaryFgHex = buttonSecondaryFgRaw ? hslToHex(buttonSecondaryFgRaw) : (isDarkTheme ? "#fafafa" : "#0a0a0a");
  
  // Ensure secondary button text has sufficient contrast
  const buttonSecondaryFgContrast = ensureContrast(buttonSecondaryFgHex, buttonSecondaryHex, 4.5);
  const buttonSecondaryFgFinal = buttonSecondaryFgContrast !== buttonSecondaryFgHex
    ? buttonSecondaryFgContrast
    : buttonSecondaryFg;
  
  const buttonDestructiveRaw = getHSLValueRaw("--destructive");
  const buttonDestructive = buttonDestructiveRaw
    ? `hsl(${buttonDestructiveRaw})`
    : variables.colorDanger;
  const buttonDestructiveHex = buttonDestructiveRaw ? hslToHex(buttonDestructiveRaw) : "#ef4444";
  
  const buttonDestructiveFgRaw = getHSLValueRaw("--destructive-foreground");
  const buttonDestructiveFg = buttonDestructiveFgRaw
    ? `hsl(${buttonDestructiveFgRaw})`
    : "#ffffff";
  const buttonDestructiveFgHex = buttonDestructiveFgRaw ? hslToHex(buttonDestructiveFgRaw) : "#ffffff";
  
  // Ensure destructive button text has sufficient contrast
  const buttonDestructiveFgContrast = ensureContrast(buttonDestructiveFgHex, buttonDestructiveHex, 4.5);
  const buttonDestructiveFgFinal = buttonDestructiveFgContrast !== buttonDestructiveFgHex
    ? buttonDestructiveFgContrast
    : buttonDestructiveFg;

  // Get surface-2 for popover background
  const surface2 = getHSLValueRaw("--surface-2");
  const popoverBg = surface2 
    ? `hsl(${surface2})` 
    : cardBg;
  
  // Get accent color for hover states
  const accent = getHSLValueRaw("--accent");
  const accentColor = accent
    ? `hsl(${accent})`
    : variables.colorNeutral;

  // Get input colors with contrast checking
  const inputBgRaw = getHSLValueRaw("--input");
  const inputBg = inputBgRaw
    ? `hsl(${inputBgRaw})`
    : variables.colorInputBackground;
  const inputBgHex = inputBgRaw ? hslToHex(inputBgRaw) : (isDarkTheme ? "#262626" : "#f5f5f5");
  
  const inputTextRaw = getHSLValueRaw("--foreground");
  const inputText = inputTextRaw
    ? `hsl(${inputTextRaw})`
    : variables.colorInputText;
  const inputTextHex = inputTextRaw ? hslToHex(inputTextRaw) : (isDarkTheme ? "#fafafa" : "#0a0a0a");
  
  // Ensure input text has sufficient contrast
  const inputTextContrast = ensureContrast(inputTextHex, inputBgHex, 4.5);
  const inputTextFinal = inputTextContrast !== inputTextHex ? inputTextContrast : inputText;

  return {
    ...(isDarkTheme && { baseTheme: dark }),
    variables: {
      ...updatedVariables,
      colorInputBackground: inputBg,
      colorInputText: inputTextFinal,
      colorInputBorder: borderColor,
    },
    elements: {
      rootBox: {
        backgroundColor: cardBg,
        color: cardFgFinal,
      },
      card: {
        backgroundColor: cardBg,
        color: cardFgFinal,
        borderColor: borderColor,
      },
      cardBox: {
        backgroundColor: cardBg,
        color: cardFgFinal,
        borderColor: borderColor,
      },
      modalContent: {
        backgroundColor: cardBg,
        color: cardFgFinal,
      },
      modalContentBox: {
        backgroundColor: cardBg,
        color: cardFgFinal,
      },
      // Popover styling with improved contrast
      organizationSwitcherPopoverCard: {
        backgroundColor: popoverBg,
        color: cardFgFinal,
        borderColor: borderColor,
        borderRadius: "0.5rem",
        boxShadow: isDarkTheme 
          ? "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
      },
      // Create organization button with proper contrast
      organizationSwitcherPopoverActionButton: {
        backgroundColor: buttonPrimary,
        color: buttonPrimaryFgFinal,
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
        color: buttonPrimaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Manage button with proper contrast
      organizationSwitcherPopoverManageButton: {
        backgroundColor: "transparent",
        color: cardFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 0.75rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      organizationSwitcherPopoverManageButtonText: {
        color: cardFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Destructive actions with proper contrast
      organizationSwitcherPopoverDestructiveButton: {
        backgroundColor: buttonDestructive,
        color: buttonDestructiveFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      organizationSwitcherPopoverDestructiveButtonText: {
        color: buttonDestructiveFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Organization switcher trigger
      organizationSwitcherTrigger: {
        color: cardFgFinal,
        backgroundColor: "transparent",
        marginLeft: "0.5rem",
        marginRight: "0.5rem",
        padding: "0.5rem",
      },
      organizationPreview: {
        backgroundColor: "transparent",
        color: cardFgFinal,
      },
      organizationPreviewMainIdentifier: {
        color: cardFgFinal,
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
        color: cardFgFinal,
      },
      text: {
        color: cardFgFinal,
      },
      formFieldLabel: {
        color: cardFgFinal,
        fontWeight: "500",
      },
      formFieldInput: {
        backgroundColor: inputBg,
        color: inputTextFinal,
        borderColor: borderColor,
      },
      formFieldInputShowPasswordButton: {
        color: cardFgFinal,
      },
      formFieldInputShowPasswordIcon: {
        color: cardFgFinal,
      },
      // Social buttons with proper contrast
      socialButtonsBlockButton: {
        backgroundColor: buttonSecondary,
        color: buttonSecondaryFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: `1px solid ${borderColor}`,
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButtonsBlockButtonText: {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButton: {
        backgroundColor: buttonSecondary,
        color: buttonSecondaryFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: `1px solid ${borderColor}`,
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
      },
      socialButtonText: {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      socialButtonIcon: {
        color: buttonSecondaryFgFinal,
      },
      // Button variants with proper contrast
      formButtonPrimary: {
        backgroundColor: buttonPrimary,
        color: buttonPrimaryFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: "none",
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      formButtonPrimaryText: {
        color: buttonPrimaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      formButtonSecondary: {
        backgroundColor: buttonSecondary,
        color: buttonSecondaryFgFinal,
        borderRadius: "0.375rem",
        padding: "0.5rem 1rem",
        border: `1px solid ${borderColor}`,
        transition: "all 150ms ease-in-out",
        cursor: "pointer",
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      formButtonSecondaryText: {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // All social button text variants
      "socialButtonsBlockButtonText__google": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__github": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__microsoft": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__apple": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__facebook": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      "socialButtonsBlockButtonText__discord": {
        color: buttonSecondaryFgFinal,
        fontWeight: "500",
        fontSize: "0.875rem",
      },
      // Text elements with proper contrast
      organizationSwitcherPopoverActionButtonText__text: {
        color: buttonPrimaryFgFinal,
      },
      organizationPreviewMainIdentifier__text: {
        color: cardFgFinal,
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
