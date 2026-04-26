import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

type EntityType = "PROPERTY" | "CONTACT" | "DOCUMENT";

interface EntityShareAcceptedEmailProps {
  recipientName: string;
  acceptedByName: string;
  entityType: EntityType;
  entityName: string;
  entityId: string;
  entityFriendlyId?: string;
  userLanguage: string;
  userTheme?: string;
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

const getEntityUrl = (type: EntityType, id: string, friendlyId: string | undefined): string => {
  const slug = friendlyId || id;
  switch (type) {
    case "PROPERTY":
      return `${baseUrl}/app/properties/${slug}`;
    case "CONTACT":
      return `${baseUrl}/app/crm/contacts/${slug}`;
    case "DOCUMENT":
      return `${baseUrl}/app/documents/${slug}`;
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
  userTheme,
}: EntityShareAcceptedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const entityUrl = getEntityUrl(entityType, entityId, entityFriendlyId);
  const entityInfo = t.entityTypes[entityType];
  const icon = entityIcons[entityType];

  return (
    <BaseLayout
      previewText={t.preview(acceptedByName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="✓"
        text={t.badge}
        colorClass="bg-green-50 text-green-700 border-green-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro(acceptedByName, entityInfo.name)}
      </Text>

      {/* Entity Details */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-3 uppercase tracking-wide">
          {t.entityLabel(entityInfo.name)}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
          {icon} {entityName}
        </Text>
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={entityUrl}
        >
          {t.ctaButton(entityInfo.name)}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={entityUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {entityUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default EntityShareAcceptedEmail;
