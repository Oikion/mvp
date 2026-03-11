import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailBadge,
  EmailHighlightBox,
  resolveColors,
} from "./components/BaseLayout";

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
  userTheme?: string;
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
  userTheme,
}: ShareEntityEmailProps) => {
  const t = translations[userLanguage] || translations.en;
  const entityT = t[entityType];
  const commonT = t.common;
  const icon = entityIcons[entityType];
  const colors = resolveColors(userTheme);

  return (
    <BaseLayout
      previewText={entityT.previewText(senderName)}
      footerText={`${commonT.sentBy} ${senderName} (${senderEmail}). ${commonT.footer} ${commonT.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon={icon}
        text={entityT.badge}
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {entityT.heading}
      </Heading>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Greeting */}
      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {commonT.greeting(recipientName)}
      </Text>

      {/* Introduction */}
      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {entityT.intro(senderName)}
      </Text>

      {/* Entity Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-2 uppercase tracking-wide">
          {commonT.entityDetails}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0 mb-2">
          {entityTitle}
        </Text>
        {entityDescription && (
          <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed">
            {entityDescription}
          </Text>
        )}
      </Section>

      {/* Personal Message (if provided) */}
      {personalMessage && (
        <EmailHighlightBox
          title={commonT.personalMessage}
          content={personalMessage}
          colorClass="bg-blue-50 border-blue-400 text-blue-800"
        />
      )}

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={entityUrl}
        >
          {entityT.viewButton}
        </Button>
      </Section>

      {/* Alternative Link */}
      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {commonT.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link
          href={entityUrl}
          style={{ color: colors.linkColor }}
          className="text-xs underline break-all"
        >
          {entityUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ShareEntityEmail;
