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

interface RequestCreatedEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  metadata?: {
    requestType?: string;
    friendlyId?: string;
    budget?: string;
    area?: string;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const translations = {
  en: {
    preview: "New request created",
    badge: "New Request",
    title: "A New Request Has Been Created",
    subtitle: "A new buyer or renter request needs attention",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} has created a new request on Oikion.`,
    requestDetails: "Request Details",
    typeLabel: "Type",
    idLabel: "Request ID",
    budgetLabel: "Budget",
    areaLabel: "Area",
    typeValues: {
      BUY: "Purchase",
      RENT: "Rental",
      LEASE: "Lease",
    },
    ctaButton: "View Request",
    altLink: "Or view at:",
    footer: "You're receiving this because a new request was created in your organization.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Νέο αίτημα δημιουργήθηκε",
    badge: "Νέο Αίτημα",
    title: "Δημιουργήθηκε Νέο Αίτημα",
    subtitle: "Ένα νέο αίτημα αγοραστή ή ενοικιαστή χρειάζεται προσοχή",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} δημιούργησε ένα νέο αίτημα στο Oikion.`,
    requestDetails: "Λεπτομέρειες Αιτήματος",
    typeLabel: "Τύπος",
    idLabel: "ID Αιτήματος",
    budgetLabel: "Προϋπολογισμός",
    areaLabel: "Περιοχή",
    typeValues: {
      BUY: "Αγορά",
      RENT: "Ενοικίαση",
      LEASE: "Μίσθωση",
    },
    ctaButton: "Προβολή Αιτήματος",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή δημιουργήθηκε νέο αίτημα στον οργανισμό σας.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Nový požadavek vytvořen",
    badge: "Nový Požadavek",
    title: "Byl Vytvořen Nový Požadavek",
    subtitle: "Nový požadavek kupujícího nebo nájemce vyžaduje pozornost",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} vytvořil nový požadavek na Oikionu.`,
    requestDetails: "Detaily Požadavku",
    typeLabel: "Typ",
    idLabel: "ID Požadavku",
    budgetLabel: "Rozpočet",
    areaLabel: "Oblast",
    typeValues: {
      BUY: "Koupě",
      RENT: "Pronájem",
      LEASE: "Leasing",
    },
    ctaButton: "Zobrazit Požadavek",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože byl ve vaší organizaci vytvořen nový požadavek.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const RequestCreatedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: RequestCreatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const requestUrl = `${baseUrl}/app/requests/${entityId}`;
  const requestType = metadata?.requestType as keyof typeof t.typeValues | undefined;
  const typeLabel = requestType ? (t.typeValues[requestType] || requestType) : undefined;

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon="📋"
        text={t.badge}
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
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
        {t.intro(actorName)}
      </Text>

      {/* Request Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.requestDetails}
        </Text>

        {entityName && (
          <Section className="mb-4">
            <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0">
              {entityName}
            </Text>
          </Section>
        )}

        {metadata?.friendlyId && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.idLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              {metadata.friendlyId}
            </Text>
          </Section>
        )}

        {typeLabel && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.typeLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              {typeLabel}
            </Text>
          </Section>
        )}

        {metadata?.budget && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.budgetLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              {metadata.budget}
            </Text>
          </Section>
        )}

        {metadata?.area && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.areaLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              📍 {metadata.area}
            </Text>
          </Section>
        )}
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={requestUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={requestUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {requestUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default RequestCreatedEmail;
