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

interface ClientCreatedEmailProps {
  recipientName: string;
  creatorName: string;
  clientId: string;
  clientName: string;
  isAssigned?: boolean;
  userLanguage: string;
}

const translations = {
  en: {
    preview: {
      created: (creator: string) => `${creator} added a new client`,
      assigned: (creator: string) => `${creator} assigned a client to you`,
    },
    badge: {
      created: "New Client",
      assigned: "Client Assigned",
    },
    title: {
      created: "New Client Added",
      assigned: "Client Assigned to You",
    },
    subtitle: {
      created: "A new client has been added to the CRM",
      assigned: "You've been assigned to manage this client",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      created: (creator: string) => `${creator} has added a new client to your organization's CRM.`,
      assigned: (creator: string) => `${creator} has assigned a client to you. You are now responsible for managing this relationship.`,
    },
    clientDetails: "Client Details",
    clientNameLabel: "Client Name",
    ctaButton: "View Client",
    altLink: "Or view at:",
    footer: {
      created: "You're receiving this because a new client was added to your organization.",
      assigned: "You're receiving this because a client was assigned to you.",
    },
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε έναν νέο πελάτη`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε έναν πελάτη`,
    },
    badge: {
      created: "Νέος Πελάτης",
      assigned: "Ανάθεση Πελάτη",
    },
    title: {
      created: "Νέος Πελάτης Προστέθηκε",
      assigned: "Πελάτης Ανατέθηκε σε Εσάς",
    },
    subtitle: {
      created: "Ένας νέος πελάτης προστέθηκε στο CRM",
      assigned: "Σας ανατέθηκε να διαχειριστείτε αυτόν τον πελάτη",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε έναν νέο πελάτη στο CRM του οργανισμού σας.`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε έναν πελάτη. Είστε πλέον υπεύθυνοι για τη διαχείριση αυτής της σχέσης.`,
    },
    clientDetails: "Στοιχεία Πελάτη",
    clientNameLabel: "Όνομα Πελάτη",
    ctaButton: "Προβολή Πελάτη",
    altLink: "Ή δείτε στο:",
    footer: {
      created: "Λαμβάνετε αυτό επειδή προστέθηκε ένας νέος πελάτης στον οργανισμό σας.",
      assigned: "Λαμβάνετε αυτό επειδή σας ανατέθηκε ένας πελάτης.",
    },
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      created: (creator: string) => `${creator} přidal nového klienta`,
      assigned: (creator: string) => `${creator} vám přiřadil klienta`,
    },
    badge: {
      created: "Nový Klient",
      assigned: "Klient Přiřazen",
    },
    title: {
      created: "Nový Klient Přidán",
      assigned: "Klient Přiřazen Vám",
    },
    subtitle: {
      created: "Nový klient byl přidán do CRM",
      assigned: "Byli jste pověřeni správou tohoto klienta",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      created: (creator: string) => `${creator} přidal nového klienta do CRM vaší organizace.`,
      assigned: (creator: string) => `${creator} vám přiřadil klienta. Nyní jste zodpovědní za správu tohoto vztahu.`,
    },
    clientDetails: "Detaily Klienta",
    clientNameLabel: "Jméno Klienta",
    ctaButton: "Zobrazit Klienta",
    altLink: "Nebo zobrazte na:",
    footer: {
      created: "Tento email dostáváte, protože byl přidán nový klient do vaší organizace.",
      assigned: "Tento email dostáváte, protože vám byl přiřazen klient.",
    },
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const ClientCreatedEmail = ({
  recipientName,
  creatorName,
  clientId,
  clientName,
  isAssigned = false,
  userLanguage,
}: ClientCreatedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const type = isAssigned ? "assigned" : "created";
  const clientUrl = `${baseUrl}/app/crm/accounts/${clientId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview[type](creatorName)}</Preview>
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
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${isAssigned ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  👤 {t.badge[type]}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title[type]}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle[type]}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro[type](creatorName)}
              </Text>

              {/* Client Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.clientDetails}
                </Text>

                <Section>
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.clientNameLabel}
                  </Text>
                  <Text className="text-zinc-900 text-lg font-semibold m-0">
                    {clientName}
                  </Text>
                </Section>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={clientUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={clientUrl} className="text-blue-600 text-xs underline break-all">
                  {clientUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer[type]} {t.footerNote}
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

export default ClientCreatedEmail;
