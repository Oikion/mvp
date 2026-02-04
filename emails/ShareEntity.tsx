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

export type ShareEntityType = "property" | "client" | "post";

interface ShareEntityEmailProps {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  entityType: ShareEntityType;
  entityTitle: string;
  entityDescription?: string;
  entityUrl: string;
  personalMessage?: string;
  userLanguage: "en" | "el";
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

// Entity type icons (emoji for email compatibility)
const entityIcons = {
  property: "🏠",
  client: "👤",
  post: "📝",
};

// Translations
const translations = {
  en: {
    property: {
      previewText: (sender: string) => `${sender} shared a property with you`,
      badge: "Property Shared",
      heading: "New Property Shared",
      intro: (sender: string) => `${sender} wants to share a property listing with you.`,
      viewButton: "View Property",
    },
    client: {
      previewText: (sender: string) => `${sender} shared a client with you`,
      badge: "Client Shared",
      heading: "New Client Shared",
      intro: (sender: string) => `${sender} wants to share a client profile with you.`,
      viewButton: "View Client",
    },
    post: {
      previewText: (sender: string) => `${sender} shared a post with you`,
      badge: "Post Shared",
      heading: "New Post Shared",
      intro: (sender: string) => `${sender} wants to share a post with you.`,
      viewButton: "View Post",
    },
    common: {
      greeting: (name: string) => `Hello ${name},`,
      personalMessage: "Personal message:",
      entityDetails: "Details",
      altLink: "Or copy and paste this link:",
      footer: "This email was sent from Oikion.",
      footerNote: "If you didn't expect this email, you can safely ignore it.",
      sentBy: "Shared by",
    },
  },
  el: {
    property: {
      previewText: (sender: string) => `Ο/Η ${sender} μοιράστηκε ένα ακίνητο μαζί σας`,
      badge: "Κοινοποίηση Ακινήτου",
      heading: "Νέα Κοινοποίηση Ακινήτου",
      intro: (sender: string) => `Ο/Η ${sender} θέλει να μοιραστεί μια καταχώριση ακινήτου μαζί σας.`,
      viewButton: "Προβολή Ακινήτου",
    },
    client: {
      previewText: (sender: string) => `Ο/Η ${sender} μοιράστηκε έναν πελάτη μαζί σας`,
      badge: "Κοινοποίηση Πελάτη",
      heading: "Νέα Κοινοποίηση Πελάτη",
      intro: (sender: string) => `Ο/Η ${sender} θέλει να μοιραστεί ένα προφίλ πελάτη μαζί σας.`,
      viewButton: "Προβολή Πελάτη",
    },
    post: {
      previewText: (sender: string) => `Ο/Η ${sender} μοιράστηκε μια δημοσίευση μαζί σας`,
      badge: "Κοινοποίηση Δημοσίευσης",
      heading: "Νέα Κοινοποίηση Δημοσίευσης",
      intro: (sender: string) => `Ο/Η ${sender} θέλει να μοιραστεί μια δημοσίευση μαζί σας.`,
      viewButton: "Προβολή Δημοσίευσης",
    },
    common: {
      greeting: (name: string) => `Γεια σας ${name},`,
      personalMessage: "Προσωπικό μήνυμα:",
      entityDetails: "Λεπτομέρειες",
      altLink: "Ή αντιγράψτε αυτόν τον σύνδεσμο:",
      footer: "Αυτό το email στάλθηκε από το Oikion.",
      footerNote: "Αν δεν περιμένατε αυτό το email, μπορείτε να το αγνοήσετε.",
      sentBy: "Κοινοποιήθηκε από",
    },
  },
};

export const ShareEntityEmail = ({
  senderName,
  senderEmail,
  recipientName,
  entityType,
  entityTitle,
  entityDescription,
  entityUrl,
  personalMessage,
  userLanguage = "en",
}: ShareEntityEmailProps) => {
  const t = translations[userLanguage] || translations.en;
  const entityT = t[entityType];
  const commonT = t.common;
  const icon = entityIcons[entityType];

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{entityT.previewText(senderName)}</Preview>
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
                  {icon} {entityT.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {entityT.heading}
              </Heading>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {commonT.greeting(recipientName)}
              </Text>

              {/* Introduction */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {entityT.intro(senderName)}
              </Text>

              {/* Entity Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-2 uppercase tracking-wide">
                  {commonT.entityDetails}
                </Text>
                <Text className="text-zinc-900 text-lg font-semibold m-0 mb-2">
                  {entityTitle}
                </Text>
                {entityDescription && (
                  <Text className="text-zinc-600 text-sm m-0 leading-relaxed">
                    {entityDescription}
                  </Text>
                )}
              </Section>

              {/* Personal Message (if provided) */}
              {personalMessage && (
                <Section className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-5 mb-6">
                  <Text className="text-blue-800 text-xs font-semibold m-0 mb-2 uppercase tracking-wide">
                    {commonT.personalMessage}
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
                  {entityT.viewButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {commonT.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link
                  href={entityUrl}
                  className="text-blue-600 text-xs underline break-all"
                >
                  {entityUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {commonT.sentBy}{" "}
                <span className="font-medium text-zinc-600">{senderName}</span>{" "}
                <span className="text-zinc-400">({senderEmail})</span>
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0">
                {commonT.footer} {commonT.footerNote}
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

export default ShareEntityEmail;
