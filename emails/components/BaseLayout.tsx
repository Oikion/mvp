import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  type EmailTheme,
  type EmailThemeColors,
  EMAIL_THEMES,
  getEmailTheme,
} from "../utils/theme";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
  footerText?: string;
  footerNote?: string;
  /** App theme string (e.g. "estate", "estate-dark", "dark"). Defaults to "estate". */
  emailTheme?: string | null;
  /** Optional unsubscribe URL rendered as a link in the footer. */
  unsubscribeUrl?: string;
}

export interface BadgeProps {
  icon: string;
  text: string;
  colorClass?: string;
}

export interface HeaderSectionProps {
  badge?: BadgeProps;
  title: string;
  subtitle?: string;
  colors: EmailThemeColors;
}

export interface CTAButtonProps {
  href: string;
  text: string;
  altLinkText?: string;
  colors: EmailThemeColors;
}

function resolveColors(emailTheme?: string | null): EmailThemeColors {
  const key = getEmailTheme(emailTheme);
  return EMAIL_THEMES[key];
}

/**
 * Base email layout component with Oikion branding and theme support.
 */
export function BaseLayout({
  previewText,
  children,
  footerText,
  footerNote,
  emailTheme,
  unsubscribeUrl,
}: BaseLayoutProps) {
  const colors = resolveColors(emailTheme);
  const isDark = getEmailTheme(emailTheme) === "estate-dark";

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content={isDark ? "dark" : "light"} />
        <meta name="supported-color-schemes" content={isDark ? "dark light" : "light"} />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body
          style={{ backgroundColor: colors.outerBg }}
          className="my-auto mx-auto font-sans"
        >
          <Container
            style={{
              backgroundColor: colors.containerBg,
              border: `1px solid ${colors.containerBorder}`,
            }}
            className="rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden"
          >
            {/* Header */}
            <Section
              style={{ backgroundColor: colors.headerBg }}
              className="px-8 py-10 text-center"
            >
              <Text
                style={{ color: colors.headerTitle }}
                className="text-2xl font-bold m-0 tracking-tight"
              >
                Oikion
              </Text>
              <Text
                style={{ color: colors.headerSubtitle }}
                className="text-sm m-0 mt-1"
              >
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section
              style={{ backgroundColor: colors.contentBg }}
              className="px-8 py-10"
            >
              {children}
            </Section>

            {/* Footer */}
            <Section
              style={{
                backgroundColor: colors.footerBg,
                borderTop: `1px solid ${colors.footerBorder}`,
              }}
              className="px-8 py-6"
            >
              {(footerText || footerNote) && (
                <Text
                  style={{ color: colors.footerText }}
                  className="text-xs text-center m-0 mb-2"
                >
                  {footerText} {footerNote}
                </Text>
              )}
              <Text
                style={{ color: colors.footerText }}
                className="text-xs text-center m-0 mt-3"
              >
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
              {unsubscribeUrl && (
                <Text style={{ fontSize: '11px', color: '#888888', textAlign: 'center', marginTop: '8px' }}>
                  <Link href={unsubscribeUrl} style={{ color: '#888888' }}>
                    Unsubscribe / Κατάργηση εγγραφής
                  </Link>
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/**
 * Badge component for email headers.
 */
export function EmailBadge({
  icon,
  text,
  colorClass = "bg-blue-50 text-blue-700 border-blue-200",
}: BadgeProps) {
  return (
    <Section className="mb-6 text-center">
      <span
        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${colorClass}`}
      >
        {icon} {text}
      </span>
    </Section>
  );
}

/**
 * Header section with optional badge, title, and subtitle.
 * Accepts colors from the active theme.
 */
export function EmailHeader({ badge, title, subtitle, colors }: HeaderSectionProps) {
  return (
    <>
      {badge && <EmailBadge {...badge} />}
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {title}
      </Heading>
      {subtitle && (
        <Text
          style={{ color: colors.textSecondary }}
          className="text-base text-center m-0 mb-6 leading-relaxed"
        >
          {subtitle}
        </Text>
      )}
      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />
    </>
  );
}

/**
 * CTA Button with optional alternative link.
 */
export function EmailCTAButton({ href, text, altLinkText, colors }: CTAButtonProps) {
  return (
    <>
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={href}
        >
          {text}
        </Button>
      </Section>
      {altLinkText && (
        <>
          <Text
            style={{ color: colors.textMuted }}
            className="text-xs text-center m-0 mb-2"
          >
            {altLinkText}
          </Text>
          <Text className="text-center m-0">
            <Link
              href={href}
              style={{ color: colors.linkColor }}
              className="text-xs underline break-all"
            >
              {href}
            </Link>
          </Text>
        </>
      )}
    </>
  );
}

/**
 * Greeting text component.
 */
export function EmailGreeting({
  name,
  text,
  colors,
}: {
  name: string;
  text: string;
  colors?: EmailThemeColors;
}) {
  return (
    <Text
      style={colors ? { color: colors.textSecondary } : undefined}
      className="text-sm leading-6 m-0 mb-4 text-zinc-700"
    >
      {text.replace("{name}", name)}
    </Text>
  );
}

/**
 * Standard paragraph text.
 */
export function EmailText({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors?: EmailThemeColors;
}) {
  return (
    <Text
      style={colors ? { color: colors.textSecondary } : undefined}
      className="text-sm leading-6 m-0 mb-6 text-zinc-700"
    >
      {children}
    </Text>
  );
}

/**
 * Details card component.
 */
export function EmailDetailsCard({
  title,
  children,
  colors,
}: {
  title?: string;
  children: React.ReactNode;
  colors?: EmailThemeColors;
}) {
  return (
    <Section
      style={
        colors
          ? {
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
            }
          : undefined
      }
      className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6"
    >
      {title && (
        <Text
          style={colors ? { color: colors.textMuted } : undefined}
          className="text-xs font-medium m-0 mb-4 uppercase tracking-wide text-zinc-500"
        >
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
}

/**
 * Detail row component for key-value pairs.
 */
export function EmailDetailRow({
  label,
  value,
  isLast = false,
  colors,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
  colors?: EmailThemeColors;
}) {
  return (
    <Section className={isLast ? "" : "mb-4"}>
      <Text
        style={colors ? { color: colors.textMuted } : undefined}
        className="text-xs m-0 mb-1 text-zinc-500"
      >
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text
          style={colors ? { color: colors.textPrimary } : undefined}
          className="text-base font-semibold m-0 text-zinc-900"
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </Section>
  );
}

/**
 * Highlighted message box (e.g., for personal messages).
 */
export function EmailHighlightBox({
  title,
  content,
  colorClass = "bg-blue-50 border-blue-400 text-blue-800",
}: {
  title?: string;
  content: string;
  colorClass?: string;
}) {
  const bgColor = colorClass.split(" ")[0];
  const borderColor = colorClass.split(" ")[1];
  const textColor = colorClass.split(" ")[2];

  return (
    <Section
      className={`${bgColor} border-l-4 ${borderColor} rounded-r-lg p-5 mb-6`}
    >
      {title && (
        <Text
          className={`${textColor} text-xs font-semibold m-0 mb-2 uppercase tracking-wide`}
        >
          {title}
        </Text>
      )}
      <Text
        className={`${textColor.replace("800", "900")} text-sm m-0 italic leading-relaxed`}
      >
        &ldquo;{content}&rdquo;
      </Text>
    </Section>
  );
}

// Badge color presets
export const BADGE_COLORS = {
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
} as const;

// Common translations for shared strings
export const commonTranslations = {
  en: {
    greeting: (name: string) => `Hello ${name},`,
    viewButton: "View Details",
    altLink: "Or view at:",
    footer: "This is an automated notification from Oikion.",
    footerNote: "If you didn't expect this, you can safely ignore it.",
  },
  el: {
    greeting: (name: string) => `Γεια σας ${name},`,
    viewButton: "Προβολή Λεπτομερειών",
    altLink: "Ή δείτε στο:",
    footer: "Αυτή είναι μια αυτόματη ειδοποίηση από το Oikion.",
    footerNote: "Αν δεν το περιμένατε, μπορείτε να το αγνοήσετε.",
  },
  cz: {
    greeting: (name: string) => `Dobrý den ${name},`,
    viewButton: "Zobrazit Detaily",
    altLink: "Nebo zobrazte na:",
    footer: "Toto je automatické oznámení z Oikion.",
    footerNote: "Pokud jste to neočekávali, můžete to ignorovat.",
  },
};

export type SupportedLanguage = "en" | "el" | "cz";

export function getTranslations<T extends Record<string, any>>(
  translations: Record<SupportedLanguage, T>,
  language: string
): T {
  return translations[language as SupportedLanguage] || translations.en;
}

export { baseUrl, resolveColors };
