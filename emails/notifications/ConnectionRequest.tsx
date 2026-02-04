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

interface ConnectionRequestEmailProps {
  recipientName: string;
  requesterName: string;
  requesterTitle?: string;
  connectionId: string;
  userLanguage: string;
}

const translations = {
  en: {
    preview: (requester: string) => `${requester} wants to connect with you`,
    badge: "New Connection Request",
    title: "New Connection Request",
    subtitle: "Expand your professional network",
    greeting: (name: string) => `Hello ${name},`,
    intro: (requester: string) => `${requester} has sent you a connection request on Oikion.`,
    requesterLabel: "Connection Request From",
    ctaButton: "View Request",
    altLink: "Or view at:",
    footer: "You're receiving this because you received a connection request.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (requester: string) => `Ο/Η ${requester} θέλει να συνδεθεί μαζί σας`,
    badge: "Νέο Αίτημα Σύνδεσης",
    title: "Νέο Αίτημα Σύνδεσης",
    subtitle: "Επεκτείνετε το επαγγελματικό σας δίκτυο",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (requester: string) => `Ο/Η ${requester} σας έστειλε ένα αίτημα σύνδεσης στο Oikion.`,
    requesterLabel: "Αίτημα Σύνδεσης Από",
    ctaButton: "Προβολή Αιτήματος",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή λάβατε ένα αίτημα σύνδεσης.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (requester: string) => `${requester} se s vámi chce spojit`,
    badge: "Nová Žádost o Spojení",
    title: "Nová Žádost o Spojení",
    subtitle: "Rozšiřte svou profesní síť",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (requester: string) => `${requester} vám poslal žádost o spojení na Oikionu.`,
    requesterLabel: "Žádost o Spojení Od",
    ctaButton: "Zobrazit Žádost",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože jste obdrželi žádost o spojení.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const ConnectionRequestEmail = ({
  recipientName,
  requesterName,
  requesterTitle,
  connectionId,
  userLanguage,
}: ConnectionRequestEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const connectionUrl = `${baseUrl}/app/network/connections?request=${connectionId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(requesterName)}</Preview>
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
                <span className="inline-block bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200">
                  🤝 {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(requesterName)}
              </Text>

              {/* Requester Info */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-3 uppercase tracking-wide">
                  {t.requesterLabel}
                </Text>
                <Text className="text-zinc-900 text-lg font-semibold m-0">
                  {requesterName}
                </Text>
                {requesterTitle && (
                  <Text className="text-zinc-600 text-sm m-0 mt-1">
                    {requesterTitle}
                  </Text>
                )}
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={connectionUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={connectionUrl} className="text-blue-600 text-xs underline break-all">
                  {connectionUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer} {t.footerNote}
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

export default ConnectionRequestEmail;
