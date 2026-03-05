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

interface PropertyCreatedEmailProps {
  recipientName: string;
  creatorName: string;
  propertyId: string;
  propertyFriendlyId?: string;
  propertyName: string;
  propertyAddress?: string;
  isAssigned?: boolean;
  userLanguage: string;
}

const translations = {
  en: {
    preview: {
      created: (creator: string) => `${creator} added a new property`,
      assigned: (creator: string) => `${creator} assigned a property to you`,
    },
    badge: {
      created: "New Property",
      assigned: "Property Assigned",
    },
    title: {
      created: "New Property Added",
      assigned: "Property Assigned to You",
    },
    subtitle: {
      created: "A new property has been added to the portfolio",
      assigned: "You've been assigned to manage this property",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      created: (creator: string) => `${creator} has added a new property to your organization's portfolio.`,
      assigned: (creator: string) => `${creator} has assigned a property to you. You are now responsible for managing this listing.`,
    },
    propertyDetails: "Property Details",
    propertyNameLabel: "Property Name",
    addressLabel: "Address",
    ctaButton: "View Property",
    altLink: "Or view at:",
    footer: {
      created: "You're receiving this because a new property was added to your organization.",
      assigned: "You're receiving this because a property was assigned to you.",
    },
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε ένα νέο ακίνητο`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε ένα ακίνητο`,
    },
    badge: {
      created: "Νέο Ακίνητο",
      assigned: "Ανάθεση Ακινήτου",
    },
    title: {
      created: "Νέο Ακίνητο Προστέθηκε",
      assigned: "Ακίνητο Ανατέθηκε σε Εσάς",
    },
    subtitle: {
      created: "Ένα νέο ακίνητο προστέθηκε στο χαρτοφυλάκιο",
      assigned: "Σας ανατέθηκε να διαχειριστείτε αυτό το ακίνητο",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε ένα νέο ακίνητο στο χαρτοφυλάκιο του οργανισμού σας.`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε ένα ακίνητο. Είστε πλέον υπεύθυνοι για τη διαχείριση αυτής της καταχώρισης.`,
    },
    propertyDetails: "Στοιχεία Ακινήτου",
    propertyNameLabel: "Όνομα Ακινήτου",
    addressLabel: "Διεύθυνση",
    ctaButton: "Προβολή Ακινήτου",
    altLink: "Ή δείτε στο:",
    footer: {
      created: "Λαμβάνετε αυτό επειδή προστέθηκε ένα νέο ακίνητο στον οργανισμό σας.",
      assigned: "Λαμβάνετε αυτό επειδή σας ανατέθηκε ένα ακίνητο.",
    },
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      created: (creator: string) => `${creator} přidal novou nemovitost`,
      assigned: (creator: string) => `${creator} vám přiřadil nemovitost`,
    },
    badge: {
      created: "Nová Nemovitost",
      assigned: "Nemovitost Přiřazena",
    },
    title: {
      created: "Nová Nemovitost Přidána",
      assigned: "Nemovitost Přiřazena Vám",
    },
    subtitle: {
      created: "Nová nemovitost byla přidána do portfolia",
      assigned: "Byli jste pověřeni správou této nemovitosti",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      created: (creator: string) => `${creator} přidal novou nemovitost do portfolia vaší organizace.`,
      assigned: (creator: string) => `${creator} vám přiřadil nemovitost. Nyní jste zodpovědní za správu tohoto inzerátu.`,
    },
    propertyDetails: "Detaily Nemovitosti",
    propertyNameLabel: "Název Nemovitosti",
    addressLabel: "Adresa",
    ctaButton: "Zobrazit Nemovitost",
    altLink: "Nebo zobrazte na:",
    footer: {
      created: "Tento email dostáváte, protože byla přidána nová nemovitost do vaší organizace.",
      assigned: "Tento email dostáváte, protože vám byla přiřazena nemovitost.",
    },
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const PropertyCreatedEmail = ({
  recipientName,
  creatorName,
  propertyId,
  propertyFriendlyId,
  propertyName,
  propertyAddress,
  isAssigned = false,
  userLanguage,
}: PropertyCreatedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const type = isAssigned ? "assigned" : "created";
  const propertyUrl = `${baseUrl}/app/properties/${propertyFriendlyId ?? propertyId}`;

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
                  🏠 {t.badge[type]}
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

              {/* Property Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.propertyDetails}
                </Text>

                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.propertyNameLabel}
                  </Text>
                  <Text className="text-zinc-900 text-lg font-semibold m-0">
                    {propertyName}
                  </Text>
                </Section>

                {propertyAddress && (
                  <Section>
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.addressLabel}
                    </Text>
                    <Text className="text-zinc-700 text-sm m-0">
                      📍 {propertyAddress}
                    </Text>
                  </Section>
                )}
              </Section>

              {/* CTA Button */}
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

export default PropertyCreatedEmail;
