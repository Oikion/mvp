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

interface InviteUserEmailProps {
  username: string;
  invitedByUsername: string;
  invitedUserPassword: string;
  userLanguage: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

const translations = {
  en: {
    preview: (inviter: string) => `You've been invited by ${inviter} to join Oikion`,
    title: "You're Invited!",
    subtitle: "Join your team on Oikion",
    greeting: (name: string) => `Hello ${name},`,
    intro: (inviter: string) => `${inviter} has invited you to collaborate on Oikion - the modern platform for real estate professionals.`,
    credentialsTitle: "Your login credentials",
    passwordLabel: "Temporary password:",
    passwordNote: "Please change your password after your first login for security.",
    ctaButton: "Accept Invitation",
    altLink: "Or copy and paste this link:",
    footer: "This invitation was intended for",
    footerNote: "If you weren't expecting this invitation, you can safely ignore this email.",
    support: "Questions? Contact us at support@oikion.com",
  },
  el: {
    preview: (inviter: string) => `Προσκληθήκατε από τον/την ${inviter} να συμμετάσχετε στο Oikion`,
    title: "Έχετε Πρόσκληση!",
    subtitle: "Συμμετέχετε στην ομάδα σας στο Oikion",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (inviter: string) => `Ο/Η ${inviter} σας προσκάλεσε να συνεργαστείτε στο Oikion - τη σύγχρονη πλατφόρμα για επαγγελματίες ακινήτων.`,
    credentialsTitle: "Τα στοιχεία σύνδεσής σας",
    passwordLabel: "Προσωρινός κωδικός:",
    passwordNote: "Παρακαλώ αλλάξτε τον κωδικό σας μετά την πρώτη σύνδεση για ασφάλεια.",
    ctaButton: "Αποδοχή Πρόσκλησης",
    altLink: "Ή αντιγράψτε αυτόν τον σύνδεσμο:",
    footer: "Αυτή η πρόσκληση προοριζόταν για",
    footerNote: "Αν δεν περιμένατε αυτή την πρόσκληση, μπορείτε να αγνοήσετε αυτό το email.",
    support: "Ερωτήσεις; Επικοινωνήστε μαζί μας στο support@oikion.com",
  },
  cz: {
    preview: (inviter: string) => `Uživatel ${inviter} vás pozval do Oikion`,
    title: "Máte Pozvánku!",
    subtitle: "Připojte se k týmu na Oikion",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (inviter: string) => `${inviter} vás pozval ke spolupráci na Oikion - moderní platformě pro realitní profesionály.`,
    credentialsTitle: "Vaše přihlašovací údaje",
    passwordLabel: "Dočasné heslo:",
    passwordNote: "Po prvním přihlášení si prosím změňte heslo pro větší bezpečnost.",
    ctaButton: "Přijmout Pozvánku",
    altLink: "Nebo zkopírujte tento odkaz:",
    footer: "Tato pozvánka byla určena pro",
    footerNote: "Pokud jste tuto pozvánku neočekávali, můžete tento email ignorovat.",
    support: "Otázky? Kontaktujte nás na support@oikion.com",
  },
};

export const InviteUserEmail = ({
  username,
  invitedByUsername,
  invitedUserPassword,
  userLanguage,
  userTheme,
}: InviteUserEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const colors = resolveColors(userTheme);

  return (
    <BaseLayout
      previewText={t.preview(invitedByUsername)}
      footerText={`${t.footer} ${username}. ${t.footerNote}`}
      footerNote={t.support}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon=""
        text="Team Invitation"
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
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
        {t.intro(invitedByUsername)}
      </Text>

      {/* Credentials Box */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-4">
          {t.credentialsTitle}
        </Text>
        <Section
          style={{ backgroundColor: colors.containerBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-md p-4 mb-3"
        >
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.passwordLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-base font-mono font-semibold m-0">
            {invitedUserPassword}
          </Text>
        </Section>
        <Text className="text-amber-600 text-xs m-0 flex items-start gap-1">
          ⚠️ {t.passwordNote}
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

export default InviteUserEmail;
