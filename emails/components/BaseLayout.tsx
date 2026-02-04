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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
  footerText?: string;
  footerNote?: string;
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
}

export interface CTAButtonProps {
  href: string;
  text: string;
  altLinkText?: string;
}

/**
 * Base email layout component with Oikion branding
 */
export function BaseLayout({
  previewText,
  children,
  footerText,
  footerNote,
}: BaseLayoutProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">{children}</Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              {footerText && (
                <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                  {footerText} {footerNote}
                </Text>
              )}
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/**
 * Badge component for email headers
 */
export function EmailBadge({ icon, text, colorClass = "bg-blue-50 text-blue-700 border-blue-200" }: BadgeProps) {
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
 * Header section with optional badge, title, and subtitle
 */
export function EmailHeader({ badge, title, subtitle }: HeaderSectionProps) {
  return (
    <>
      {badge && <EmailBadge {...badge} />}
      <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
        {title}
      </Heading>
      {subtitle && (
        <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
          {subtitle}
        </Text>
      )}
      <Hr className="border-zinc-200 my-6" />
    </>
  );
}

/**
 * CTA Button with optional alternative link
 */
export function EmailCTAButton({ href, text, altLinkText }: CTAButtonProps) {
  return (
    <>
      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={href}
        >
          {text}
        </Button>
      </Section>
      {altLinkText && (
        <>
          <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
            {altLinkText}
          </Text>
          <Text className="text-center m-0">
            <Link href={href} className="text-blue-600 text-xs underline break-all">
              {href}
            </Link>
          </Text>
        </>
      )}
    </>
  );
}

/**
 * Greeting text component
 */
export function EmailGreeting({ name, text }: { name: string; text: string }) {
  return (
    <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
      {text.replace("{name}", name)}
    </Text>
  );
}

/**
 * Standard paragraph text
 */
export function EmailText({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">{children}</Text>
  );
}

/**
 * Details card component
 */
export function EmailDetailsCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
      {title && (
        <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
}

/**
 * Detail row component for key-value pairs
 */
export function EmailDetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <Section className={isLast ? "" : "mb-4"}>
      <Text className="text-zinc-500 text-xs m-0 mb-1">{label}</Text>
      {typeof value === "string" ? (
        <Text className="text-zinc-900 text-base font-semibold m-0">{value}</Text>
      ) : (
        value
      )}
    </Section>
  );
}

/**
 * Highlighted message box (e.g., for personal messages)
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
      <Text className={`${textColor.replace("800", "900")} text-sm m-0 italic leading-relaxed`}>
        "{content}"
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

export { baseUrl };
