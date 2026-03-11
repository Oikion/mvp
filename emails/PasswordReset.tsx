import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailBadge,
  resolveColors,
} from "./components/BaseLayout";

interface PasswordResetEmailProps {
  username?: string;
  avatar?: string | null;
  email: string;
  password: string;
  userLanguage: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

const translations = {
  en: {
    preview: "Your password has been reset",
    title: "Password Reset",
    subtitle: "Your account credentials have been updated",
    greeting: (name?: string) => `Hello${name ? ` ${name}` : ""},`,
    intro: "Your password has been successfully reset. Here are your new login credentials:",
    emailLabel: "Email:",
    passwordLabel: "New password:",
    securityNote: "For security, we recommend changing this password after logging in.",
    ctaButton: "Sign In",
    altLink: "Or sign in at:",
    footer: "If you didn't request this password reset, please contact our support team immediately.",
    support: "Need help? Contact us at support@oikion.com",
  },
  el: {
    preview: "Ο κωδικός σας έχει επαναφερθεί",
    title: "Επαναφορά Κωδικού",
    subtitle: "Τα στοιχεία του λογαριασμού σας έχουν ενημερωθεί",
    greeting: (name?: string) => `Γεια σας${name ? ` ${name}` : ""},`,
    intro: "Ο κωδικός σας επαναφέρθηκε με επιτυχία. Εδώ είναι τα νέα στοιχεία σύνδεσής σας:",
    emailLabel: "Email:",
    passwordLabel: "Νέος κωδικός:",
    securityNote: "Για ασφάλεια, συνιστούμε να αλλάξετε αυτόν τον κωδικό μετά τη σύνδεση.",
    ctaButton: "Σύνδεση",
    altLink: "Ή συνδεθείτε στο:",
    footer: "Αν δεν ζητήσατε αυτή την επαναφορά κωδικού, επικοινωνήστε αμέσως με την υποστήριξή μας.",
    support: "Χρειάζεστε βοήθεια; Επικοινωνήστε μαζί μας στο support@oikion.com",
  },
  cz: {
    preview: "Vaše heslo bylo resetováno",
    title: "Reset Hesla",
    subtitle: "Vaše přihlašovací údaje byly aktualizovány",
    greeting: (name?: string) => `Dobrý den${name ? ` ${name}` : ""},`,
    intro: "Vaše heslo bylo úspěšně resetováno. Zde jsou vaše nové přihlašovací údaje:",
    emailLabel: "Email:",
    passwordLabel: "Nové heslo:",
    securityNote: "Pro bezpečnost doporučujeme změnit toto heslo po přihlášení.",
    ctaButton: "Přihlásit se",
    altLink: "Nebo se přihlaste na:",
    footer: "Pokud jste o reset hesla nežádali, okamžitě kontaktujte náš tým podpory.",
    support: "Potřebujete pomoc? Kontaktujte nás na support@oikion.com",
  },
};

export const PasswordResetEmail = ({
  username,
  email,
  password,
  userLanguage,
  userTheme,
}: PasswordResetEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const colors = resolveColors(userTheme);

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={t.footer}
      footerNote={t.support}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="🔐"
        text="Security Update"
        colorClass="bg-amber-50 text-amber-700 border-amber-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(username)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro}
      </Text>

      {/* Credentials Box */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        {/* Email */}
        <Section
          style={{ backgroundColor: colors.containerBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-md p-4 mb-3"
        >
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.emailLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0">
            {email}
          </Text>
        </Section>

        {/* Password */}
        <Section
          style={{ backgroundColor: colors.containerBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-md p-4 mb-3"
        >
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.passwordLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-base font-mono font-semibold m-0">
            {password}
          </Text>
        </Section>

        <Text className="text-amber-600 text-xs m-0 flex items-start gap-1">
          ⚠️ {t.securityNote}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={baseUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0">
        {t.altLink}{" "}
        <Link href={baseUrl} style={{ color: colors.linkColor }} className="underline">
          {baseUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default PasswordResetEmail;
