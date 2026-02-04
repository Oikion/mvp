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

interface PasswordResetEmailProps {
  username?: string;
  avatar?: string | null;
  email: string;
  password: string;
  userLanguage: string;
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
}: PasswordResetEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview}</Preview>
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
              {/* Security Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full border border-amber-200">
                  🔐 Security Update
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
                {t.intro}
              </Text>

              {/* Credentials Box */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                {/* Email */}
                <Section className="bg-white border border-zinc-200 rounded-md p-4 mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.emailLabel}
                  </Text>
                  <Text className="text-zinc-900 text-base font-medium m-0">
                    {email}
                  </Text>
                </Section>
                
                {/* Password */}
                <Section className="bg-white border border-zinc-200 rounded-md p-4 mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.passwordLabel}
                  </Text>
                  <Text className="text-zinc-900 text-base font-mono font-semibold m-0">
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
              <Text className="text-red-500 text-xs text-center m-0 mb-3 font-medium">
                {t.footer}
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

export default PasswordResetEmail;
