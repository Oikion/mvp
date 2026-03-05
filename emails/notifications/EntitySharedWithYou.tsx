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

type EntityType = "PROPERTY" | "CLIENT" | "DOCUMENT";

interface EntitySharedWithYouEmailProps {
  recipientName: string;
  sharedByName: string;
  entityType: EntityType;
  entityName: string;
  entityId: string;
  entityFriendlyId?: string;
  personalMessage?: string;
  userLanguage: string;
}

const entityIcons: Record<EntityType, string> = {
  PROPERTY: "🏠",
  CLIENT: "👤",
  DOCUMENT: "📄",
};

const translations = {
  en: {
    preview: (sharer: string, type: string) => `${sharer} shared a ${type.toLowerCase()} with you`,
    title: (type: string) => `${type} Shared With You`,
    subtitle: "You've received shared access",
    greeting: (name: string) => `Hello ${name},`,
    intro: (sharer: string, type: string) => `${sharer} has shared a ${type.toLowerCase()} with you on Oikion.`,
    entityLabel: (type: string) => `${type} Details`,
    personalMessage: "Personal Message",
    ctaButton: (type: string) => `View ${type}`,
    altLink: "Or view at:",
    footer: "You're receiving this because someone shared content with you.",
    footerNote: "Manage your notification preferences in settings.",
    entityTypes: {
      PROPERTY: { badge: "Property Shared", name: "Property" },
      CLIENT: { badge: "Client Shared", name: "Client" },
      DOCUMENT: { badge: "Document Shared", name: "Document" },
    },
  },
  el: {
    preview: (sharer: string, type: string) => `Ο/Η ${sharer} μοιράστηκε ένα ${type.toLowerCase()} μαζί σας`,
    title: (type: string) => `${type} Κοινοποιήθηκε`,
    subtitle: "Λάβατε κοινή πρόσβαση",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (sharer: string, type: string) => `Ο/Η ${sharer} μοιράστηκε ένα ${type.toLowerCase()} μαζί σας στο Oikion.`,
    entityLabel: (type: string) => `Λεπτομέρειες ${type}`,
    personalMessage: "Προσωπικό Μήνυμα",
    ctaButton: (type: string) => `Προβολή ${type}`,
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή κάποιος μοιράστηκε περιεχόμενο μαζί σας.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
    entityTypes: {
      PROPERTY: { badge: "Κοινοποίηση Ακινήτου", name: "Ακίνητο" },
      CLIENT: { badge: "Κοινοποίηση Πελάτη", name: "Πελάτης" },
      DOCUMENT: { badge: "Κοινοποίηση Εγγράφου", name: "Έγγραφο" },
    },
  },
  cz: {
    preview: (sharer: string, type: string) => `${sharer} s vámi sdílel ${type.toLowerCase()}`,
    title: (type: string) => `${type} Sdíleno s Vámi`,
    subtitle: "Obdrželi jste sdílený přístup",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (sharer: string, type: string) => `${sharer} s vámi sdílel ${type.toLowerCase()} na Oikionu.`,
    entityLabel: (type: string) => `Detaily ${type}`,
    personalMessage: "Osobní Zpráva",
    ctaButton: (type: string) => `Zobrazit ${type}`,
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože s vámi někdo sdílel obsah.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
    entityTypes: {
      PROPERTY: { badge: "Nemovitost Sdílena", name: "Nemovitost" },
      CLIENT: { badge: "Klient Sdílen", name: "Klient" },
      DOCUMENT: { badge: "Dokument Sdílen", name: "Dokument" },
    },
  },
};

const getEntityUrl = (type: EntityType, id: string, friendlyId: string | undefined): string => {
  const slug = friendlyId || id;
  switch (type) {
    case "PROPERTY":
      return `${baseUrl}/app/properties/${slug}`;
    case "CLIENT":
      return `${baseUrl}/app/crm/accounts/${slug}`;
    case "DOCUMENT":
      return `${baseUrl}/app/documents/${slug}`;
    default:
      return baseUrl;
  }
};

export const EntitySharedWithYouEmail = ({
  recipientName,
  sharedByName,
  entityType,
  entityName,
  entityId,
  entityFriendlyId,
  personalMessage,
  userLanguage,
}: EntitySharedWithYouEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const entityUrl = getEntityUrl(entityType, entityId, entityFriendlyId);
  const entityInfo = t.entityTypes[entityType];
  const icon = entityIcons[entityType];

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(sharedByName, entityInfo.name)}</Preview>
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
                <span className="inline-block bg-cyan-50 text-cyan-700 text-xs font-semibold px-3 py-1 rounded-full border border-cyan-200">
                  {icon} {entityInfo.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title(entityInfo.name)}
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
                {t.intro(sharedByName, entityInfo.name)}
              </Text>

              {/* Entity Details */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-3 uppercase tracking-wide">
                  {t.entityLabel(entityInfo.name)}
                </Text>
                <Text className="text-zinc-900 text-lg font-semibold m-0">
                  {entityName}
                </Text>
              </Section>

              {/* Personal Message */}
              {personalMessage && (
                <Section className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-5 mb-6">
                  <Text className="text-blue-800 text-xs font-semibold m-0 mb-2 uppercase tracking-wide">
                    {t.personalMessage}
                  </Text>
                  <Text className="text-blue-900 text-sm m-0 italic leading-relaxed">
                    "{personalMessage}"
                  </Text>
                </Section>
              )}

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={entityUrl}
                >
                  {t.ctaButton(entityInfo.name)}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={entityUrl} className="text-blue-600 text-xs underline break-all">
                  {entityUrl}
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

export default EntitySharedWithYouEmail;
