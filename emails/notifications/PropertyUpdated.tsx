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

type UpdateType = "UPDATED" | "DELETED";

interface PropertyUpdatedEmailProps {
  recipientName: string;
  actorName: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  updateType: UpdateType;
  changes?: string[];
  userLanguage: string;
}

const updateConfig: Record<UpdateType, { icon: string; color: string }> = {
  UPDATED: { icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETED: { icon: "🗑️", color: "bg-red-50 text-red-700 border-red-200" },
};

const translations = {
  en: {
    preview: {
      UPDATED: (property: string) => `Property "${property}" was updated`,
      DELETED: (property: string) => `Property "${property}" was deleted`,
    },
    badge: {
      UPDATED: "Property Updated",
      DELETED: "Property Deleted",
    },
    title: {
      UPDATED: "Property Updated",
      DELETED: "Property Deleted",
    },
    subtitle: {
      UPDATED: "Changes were made to a property you're watching",
      DELETED: "A property you were watching has been deleted",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `${actor} made changes to the property "${property}" that you're watching.`,
      DELETED: (actor: string, property: string) => `${actor} has deleted the property "${property}" that you were watching.`,
    },
    propertyDetails: "Property Details",
    propertyNameLabel: "Property Name",
    addressLabel: "Address",
    changesLabel: "Changes Made",
    ctaButton: "View Property",
    altLink: "Or view at:",
    footer: "You're receiving this because you're watching this property.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      UPDATED: (property: string) => `Το ακίνητο "${property}" ενημερώθηκε`,
      DELETED: (property: string) => `Το ακίνητο "${property}" διαγράφηκε`,
    },
    badge: {
      UPDATED: "Ενημέρωση Ακινήτου",
      DELETED: "Διαγραφή Ακινήτου",
    },
    title: {
      UPDATED: "Το Ακίνητο Ενημερώθηκε",
      DELETED: "Το Ακίνητο Διαγράφηκε",
    },
    subtitle: {
      UPDATED: "Έγιναν αλλαγές σε ακίνητο που παρακολουθείτε",
      DELETED: "Ένα ακίνητο που παρακολουθούσατε διαγράφηκε",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `Ο/Η ${actor} έκανε αλλαγές στο ακίνητο "${property}" που παρακολουθείτε.`,
      DELETED: (actor: string, property: string) => `Ο/Η ${actor} διέγραψε το ακίνητο "${property}" που παρακολουθούσατε.`,
    },
    propertyDetails: "Στοιχεία Ακινήτου",
    propertyNameLabel: "Όνομα Ακινήτου",
    addressLabel: "Διεύθυνση",
    changesLabel: "Αλλαγές που Έγιναν",
    ctaButton: "Προβολή Ακινήτου",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή παρακολουθείτε αυτό το ακίνητο.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      UPDATED: (property: string) => `Nemovitost "${property}" byla aktualizována`,
      DELETED: (property: string) => `Nemovitost "${property}" byla smazána`,
    },
    badge: {
      UPDATED: "Nemovitost Aktualizována",
      DELETED: "Nemovitost Smazána",
    },
    title: {
      UPDATED: "Nemovitost Aktualizována",
      DELETED: "Nemovitost Smazána",
    },
    subtitle: {
      UPDATED: "Byly provedeny změny u nemovitosti, kterou sledujete",
      DELETED: "Nemovitost, kterou jste sledovali, byla smazána",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `${actor} provedl změny u nemovitosti "${property}", kterou sledujete.`,
      DELETED: (actor: string, property: string) => `${actor} smazal nemovitost "${property}", kterou jste sledovali.`,
    },
    propertyDetails: "Detaily Nemovitosti",
    propertyNameLabel: "Název Nemovitosti",
    addressLabel: "Adresa",
    changesLabel: "Provedené Změny",
    ctaButton: "Zobrazit Nemovitost",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože sledujete tuto nemovitost.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const PropertyUpdatedEmail = ({
  recipientName,
  actorName,
  propertyId,
  propertyName,
  propertyAddress,
  updateType,
  changes,
  userLanguage,
}: PropertyUpdatedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const config = updateConfig[updateType];
  const propertyUrl = `${baseUrl}/app/properties/${propertyId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview[updateType](propertyName)}</Preview>
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
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${config.color}`}>
                  {config.icon} {t.badge[updateType]}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title[updateType]}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle[updateType]}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro[updateType](actorName, propertyName)}
              </Text>

              {/* Property Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.propertyDetails}
                </Text>

                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.propertyNameLabel}
                  </Text>
                  <Text className={`text-lg font-semibold m-0 ${updateType === "DELETED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                    🏠 {propertyName}
                  </Text>
                </Section>

                {propertyAddress && (
                  <Section className="mb-4">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.addressLabel}
                    </Text>
                    <Text className={`text-sm m-0 ${updateType === "DELETED" ? "line-through text-zinc-500" : "text-zinc-700"}`}>
                      📍 {propertyAddress}
                    </Text>
                  </Section>
                )}

                {changes && changes.length > 0 && updateType === "UPDATED" && (
                  <Section>
                    <Text className="text-zinc-500 text-xs m-0 mb-2">
                      {t.changesLabel}
                    </Text>
                    {changes.map((change, index) => (
                      <Text key={index} className="text-zinc-700 text-sm m-0 mb-1">
                        • {change}
                      </Text>
                    ))}
                  </Section>
                )}
              </Section>

              {/* CTA Button */}
              {updateType !== "DELETED" && (
                <>
                  <Section className="text-center mb-6">
                    <Button
                      className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                      href={propertyUrl}
                    >
                      {t.ctaButton}
                    </Button>
                  </Section>

                  {/* Alternative Link */}
                  <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                    {t.altLink}
                  </Text>
                  <Text className="text-center m-0">
                    <Link href={propertyUrl} className="text-blue-600 text-xs underline break-all">
                      {propertyUrl}
                    </Link>
                  </Text>
                </>
              )}
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

export default PropertyUpdatedEmail;
