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

interface EntityShareAcceptedEmailProps {
  recipientName: string;
  acceptedByName: string;
  entityType: EntityType;
  entityName: string;
  entityId: string;
  entityFriendlyId?: string;
  userLanguage: string;
}

const entityIcons: Record<EntityType, string> = {
  PROPERTY: "🏠",
  CLIENT: "👤",
  DOCUMENT: "📄",
};

const translations = {
  en: {
    preview: (accepter: string) => `${accepter} accepted your shared content`,
    badge: "Share Accepted",
    title: "Your Share Was Accepted",
    subtitle: "Collaboration has begun",
    greeting: (name: string) => `Hello ${name},`,
    intro: (accepter: string, type: string) => `${accepter} has accepted your shared ${type.toLowerCase()} on Oikion.`,
    entityLabel: (type: string) => `Shared ${type}`,
    ctaButton: (type: string) => `View ${type}`,
    altLink: "Or view at:",
    footer: "You're receiving this because your shared content was accepted.",
    footerNote: "Manage your notification preferences in settings.",
    entityTypes: {
      PROPERTY: { name: "Property" },
      CLIENT: { name: "Client" },
      DOCUMENT: { name: "Document" },
    },
  },
  el: {
    preview: (accepter: string) => `Ο/Η ${accepter} αποδέχτηκε το κοινοποιημένο περιεχόμενό σας`,
    badge: "Κοινοποίηση Αποδεκτή",
    title: "Η Κοινοποίησή σας Έγινε Αποδεκτή",
    subtitle: "Η συνεργασία ξεκίνησε",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (accepter: string, type: string) => `Ο/Η ${accepter} αποδέχτηκε το κοινοποιημένο ${type.toLowerCase()} σας στο Oikion.`,
    entityLabel: (type: string) => `Κοινοποιημένο ${type}`,
    ctaButton: (type: string) => `Προβολή ${type}`,
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή το κοινοποιημένο περιεχόμενό σας έγινε αποδεκτό.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
    entityTypes: {
      PROPERTY: { name: "Ακίνητο" },
      CLIENT: { name: "Πελάτης" },
      DOCUMENT: { name: "Έγγραφο" },
    },
  },
  cz: {
    preview: (accepter: string) => `${accepter} přijal váš sdílený obsah`,
    badge: "Sdílení Přijato",
    title: "Vaše Sdílení Bylo Přijato",
    subtitle: "Spolupráce začala",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (accepter: string, type: string) => `${accepter} přijal vaše sdílené ${type.toLowerCase()} na Oikionu.`,
    entityLabel: (type: string) => `Sdílené ${type}`,
    ctaButton: (type: string) => `Zobrazit ${type}`,
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože váš sdílený obsah byl přijat.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
    entityTypes: {
      PROPERTY: { name: "Nemovitost" },
      CLIENT: { name: "Klient" },
      DOCUMENT: { name: "Dokument" },
    },
  },
};

const getEntityUrl = (type: EntityType, id: string, friendlyId?: string): string => {
  switch (type) {
    case "PROPERTY":
      return `${baseUrl}/app/properties/${friendlyId ?? id}`;
    case "CLIENT":
      return `${baseUrl}/app/crm/accounts/${friendlyId ?? id}`;
    case "DOCUMENT":
      return `${baseUrl}/app/documents/${friendlyId ?? id}`;
    default:
      return baseUrl;
  }
};

export const EntityShareAcceptedEmail = ({
  recipientName,
  acceptedByName,
  entityType,
  entityName,
  entityId,
  entityFriendlyId,
  userLanguage,
}: EntityShareAcceptedEmailProps) => {
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
      <Preview>{t.preview(acceptedByName)}</Preview>
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
                <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                  ✓ {t.badge}
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
                {t.intro(acceptedByName, entityInfo.name)}
              </Text>

              {/* Entity Details */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-3 uppercase tracking-wide">
                  {t.entityLabel(entityInfo.name)}
                </Text>
                <Text className="text-zinc-900 text-lg font-semibold m-0">
                  {icon} {entityName}
                </Text>
              </Section>

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

export default EntityShareAcceptedEmail;
