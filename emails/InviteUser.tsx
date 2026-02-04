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

interface InviteUserEmailProps {
  username: string;
  invitedByUsername: string;
  invitedUserPassword: string;
  userLanguage: string;
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
}: InviteUserEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(invitedByUsername)}</Preview>
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
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                  Team Invitation
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(username)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(invitedByUsername)}
              </Text>

              {/* Credentials Box */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-4">
                  {t.credentialsTitle}
                </Text>
                <Section className="bg-white border border-zinc-200 rounded-md p-4 mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.passwordLabel}
                  </Text>
                  <Text className="text-zinc-900 text-base font-mono font-semibold m-0">
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
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={baseUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              <Text className="text-zinc-500 text-xs text-center m-0">
                {t.altLink}{" "}
                <Link href={baseUrl} className="text-zinc-700 underline">
                  {baseUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer}{" "}
                <span className="text-zinc-600 font-medium">{username}</span>.{" "}
                {t.footerNote}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                {t.support}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InviteUserEmail;
