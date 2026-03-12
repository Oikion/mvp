/**
 * Email Theme System
 *
 * Defines concrete color tokens for each email theme.
 * CSS variables cannot be used in email clients, so all values are explicit hex strings.
 *
 * Themes mirror the app's CSS themes defined in globals.css:
 *   [data-theme="estate"]       → warm beige + pine charcoal (light)
 *   [data-theme="estate-dark"]  → dark pine + sage green   (dark)
 */

export type EmailTheme = "estate" | "estate-dark";

export interface EmailThemeColors {
  // Outer background (body)
  outerBg: string;
  // Card container
  containerBg: string;
  containerBorder: string;
  // Header bar (brand strip at top)
  headerBg: string;
  headerTitle: string;
  headerSubtitle: string;
  // Content area
  contentBg: string;
  // Details / info cards inside content
  cardBg: string;
  cardBorder: string;
  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // HR divider
  hrColor: string;
  // CTA button
  buttonBg: string;
  buttonText: string;
  // Footer
  footerBg: string;
  footerBorder: string;
  footerText: string;
  // Links
  linkColor: string;
}

export const EMAIL_THEMES: Record<EmailTheme, EmailThemeColors> = {
  /**
   * Estate Light — Pine Charcoal + Warm Beige
   * Matches [data-theme="estate"] in globals.css
   */
  "estate": {
    outerBg: "#F2EFE9",         // warm beige (hsl 40 26% 93%)
    containerBg: "#FFFFFF",
    containerBorder: "#E0DAD0", // beige mid
    headerBg: "#262F27",        // pine charcoal
    headerTitle: "#FFFFFF",
    headerSubtitle: "#7B8C7C",  // sage green
    contentBg: "#FFFFFF",
    cardBg: "#F7F4EF",          // lighter beige
    cardBorder: "#E0DAD0",
    textPrimary: "#262F27",     // pine charcoal
    textSecondary: "#5A6B5B",   // mid sage
    textMuted: "#7B8C7C",       // sage green
    hrColor: "#E0DAD0",
    buttonBg: "#262F27",
    buttonText: "#F2EFE9",
    footerBg: "#F2EFE9",
    footerBorder: "#E0DAD0",
    footerText: "#8A9B8A",
    linkColor: "#3D6B45",       // deep sage/forest green
  },

  /**
   * Estate Dark — Dark Pine + Sage Green
   * Matches [data-theme="estate-dark"] in globals.css
   * Shell is dark; the white content card stays light for readability
   */
  "estate-dark": {
    outerBg: "#141A15",         // very dark pine
    containerBg: "#1D2620",     // dark pine card
    containerBorder: "#2D3D2F",
    headerBg: "#111815",        // deepest pine
    headerTitle: "#F0EBE0",     // warm cream
    headerSubtitle: "#7B8C7C",  // sage green
    contentBg: "#1D2620",
    cardBg: "#222E24",
    cardBorder: "#2D3D2F",
    textPrimary: "#EDE8DF",     // warm cream
    textSecondary: "#9CAE9E",   // light sage
    textMuted: "#6B7D6C",       // muted sage
    hrColor: "#2D3D2F",
    buttonBg: "#7B8C7C",        // sage green CTA
    buttonText: "#141A15",
    footerBg: "#141A15",
    footerBorder: "#2D3D2F",
    footerText: "#586959",
    linkColor: "#8FB890",       // light sage link
  },
} as const;

/**
 * Map any app theme string to an email theme.
 * Dark-mode app themes resolve to "estate-dark"; everything else to "estate".
 */
export function getEmailTheme(userTheme?: string | null): EmailTheme {
  if (!userTheme) return "estate";
  const darkThemes = new Set(["dark", "estate-dark", "twilight-lavender"]);
  return darkThemes.has(userTheme) ? "estate-dark" : "estate";
}
