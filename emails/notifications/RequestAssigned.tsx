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

interface RequestAssignedEmailProps {
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
    preview: "Request assigned to you",
    badge: "Assignment",
    title: "Request Assigned to You",
    subtitle: "A request has been assigned to you for follow-up",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string, type: string) =>
      `${actor} has assigned a ${type} request to you.`,
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
    footer: "You're receiving this because a request has been assigned to you.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Ανατέθηκε αίτημα σε εσάς",
    badge: "Ανάθεση",
    title: "Ανατέθηκε Αίτημα σε Εσάς",
    subtitle: "Ένα αίτημα σας έχει ανατεθεί για παρακολούθηση",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string, type: string) =>
      `Ο/Η ${actor} σας ανέθεσε ένα αίτημα ${type}.`,
    requestDetails: "Λεπτομέρειες Αιτήματος",
    typeLabel: "Τύπος",
    idLabel: "ID Αιτήματος",
    budgetLabel: "Προϋπολογισμός",
    areaLabel: "Περιοχή",
    typeValues: {
      BUY: "Αγοράς",
      RENT: "Ενοικίασης",
      LEASE: "Μίσθωσης",
    },
    ctaButton: "Προβολή Αιτήματος",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή σας ανατέθηκε αίτημα.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Požadavek vám byl přiřazen",
    badge: "Přiřazení",
    title: "Požadavek Vám Byl Přiřazen",
    subtitle: "Požadavek vám byl přiřazen k vyřízení",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string, type: string) =>
      `${actor} vám přiřadil požadavek na ${type}.`,
    requestDetails: "Detaily Požadavku",
    typeLabel: "Typ",
    idLabel: "ID Požadavku",
    budgetLabel: "Rozpočet",
    areaLabel: "Oblast",
    typeValues: {
      BUY: "Koupi",
      RENT: "Pronájem",
      LEASE: "Leasing",
    },
    ctaButton: "Zobrazit Požadavek",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože vám byl přiřazen požadavek.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const RequestAssignedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: RequestAssignedEmailProps) => {
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
        icon="📌"
        text={t.badge}
        colorClass="bg-amber-50 text-amber-700 border-amber-200"
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
        {t.intro(actorName, typeLabel || "")}
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

export default RequestAssignedEmail;
