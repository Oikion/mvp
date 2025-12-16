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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

// Translations
const translations = {
  en: {
    property: {
      previewText: "{senderName} shared a property with you",
      heading: "A property has been shared with you",
      intro: "{senderName} wants to share a property listing with you.",
      viewButton: "View Property",
    },
    client: {
      previewText: "{senderName} shared a client with you",
      heading: "A client has been shared with you",
      intro: "{senderName} wants to share a client profile with you.",
      viewButton: "View Client",
    },
    post: {
      previewText: "{senderName} shared a post with you",
      heading: "A post has been shared with you",
      intro: "{senderName} wants to share a post with you.",
      viewButton: "View Post",
    },
    common: {
      hello: "Hello {recipientName},",
      personalMessage: "Personal message:",
      orCopyUrl: "or copy and paste this URL into your browser:",
      footer:
        "This email was sent from Oikion. If you didn't expect this email, you can safely ignore it.",
      entityLabel: "Details:",
    },
  },
  el: {
    property: {
      previewText: "Ο/Η {senderName} μοιράστηκε ένα ακίνητο μαζί σας",
      heading: "Ένα ακίνητο έχει κοινοποιηθεί μαζί σας",
      intro: "Ο/Η {senderName} θέλει να μοιραστεί μια καταχώριση ακινήτου μαζί σας.",
      viewButton: "Προβολή Ακινήτου",
    },
    client: {
      previewText: "Ο/Η {senderName} μοιράστηκε έναν πελάτη μαζί σας",
      heading: "Ένας πελάτης έχει κοινοποιηθεί μαζί σας",
      intro: "Ο/Η {senderName} θέλει να μοιραστεί ένα προφίλ πελάτη μαζί σας.",
      viewButton: "Προβολή Πελάτη",
    },
    post: {
      previewText: "Ο/Η {senderName} μοιράστηκε μια δημοσίευση μαζί σας",
      heading: "Μια δημοσίευση έχει κοινοποιηθεί μαζί σας",
      intro: "Ο/Η {senderName} θέλει να μοιραστεί μια δημοσίευση μαζί σας.",
      viewButton: "Προβολή Δημοσίευσης",
    },
    common: {
      hello: "Γεια σας {recipientName},",
      personalMessage: "Προσωπικό μήνυμα:",
      orCopyUrl: "ή αντιγράψτε και επικολλήστε αυτό το URL στον περιηγητή σας:",
      footer:
        "Αυτό το email στάλθηκε από το Oikion. Εάν δεν περιμένατε αυτό το email, μπορείτε να το αγνοήσετε με ασφάλεια.",
      entityLabel: "Λεπτομέρειες:",
    },
  },
};

function replaceVars(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

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

  const vars = { senderName, recipientName };

  return (
    <Html>
      <Head />
      <Preview>{replaceVars(entityT.previewText, vars)}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 my-auto mx-auto font-sans">
          <Container className="bg-white border border-solid border-gray-200 rounded-lg my-10 mx-auto p-8 max-w-[520px]">
            {/* Header */}
            <Heading className="text-gray-900 text-2xl font-semibold text-center p-0 my-6 mx-0">
              {entityT.heading}
            </Heading>

            {/* Greeting */}
            <Text className="text-gray-800 text-base leading-6">
              {replaceVars(commonT.hello, vars)}
            </Text>

            {/* Introduction */}
            <Text className="text-gray-700 text-base leading-6">
              {replaceVars(entityT.intro, vars)}
            </Text>

            {/* Entity Details Box */}
            <Section className="bg-gray-50 border border-solid border-gray-200 rounded-md p-4 my-4">
              <Text className="text-gray-600 text-sm font-medium m-0 mb-1">
                {commonT.entityLabel}
              </Text>
              <Text className="text-gray-900 text-lg font-semibold m-0">
                {entityTitle}
              </Text>
              {entityDescription && (
                <Text className="text-gray-600 text-sm m-0 mt-2">
                  {entityDescription}
                </Text>
              )}
            </Section>

            {/* Personal Message (if provided) */}
            {personalMessage && (
              <Section className="bg-blue-50 border-l-4 border-solid border-blue-400 p-4 my-4 rounded-r-md">
                <Text className="text-gray-600 text-xs font-medium m-0 mb-1">
                  {commonT.personalMessage}
                </Text>
                <Text className="text-gray-800 text-sm m-0 italic">
                  "{personalMessage}"
                </Text>
              </Section>
            )}

            {/* CTA Button */}
            <Section className="text-center mt-8 mb-6">
              <Button
                className="bg-slate-800 rounded-md text-white py-3 px-6 text-sm font-semibold no-underline text-center"
                href={entityUrl}
              >
                {entityT.viewButton}
              </Button>
            </Section>

            {/* Alternative Link */}
            <Text className="text-gray-600 text-sm leading-6 text-center">
              {commonT.orCopyUrl}
            </Text>
            <Text className="text-center">
              <Link
                href={entityUrl}
                className="text-blue-600 text-sm no-underline break-all"
              >
                {entityUrl}
              </Link>
            </Text>

            <Hr className="border border-solid border-gray-200 my-6 mx-0 w-full" />

            {/* Footer */}
            <Text className="text-gray-500 text-xs leading-5 text-center">
              {commonT.footer}
            </Text>
            <Text className="text-gray-400 text-xs text-center">
              Sent by {senderName} ({senderEmail})
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ShareEntityEmail;


