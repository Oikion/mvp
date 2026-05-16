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

interface RequestStatusChangedEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  metadata?: {
    fromStatus?: string;
    toStatus?: string;
    friendlyId?: string;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const statusLabels: Record<string, Record<string, string>> = {
  en: {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    MATCHED: "Matched",
    PENDING: "Pending",
    CLOSED: "Closed",
    CANCELLED: "Cancelled",
    ARCHIVED: "Archived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  },
  el: {
    ACTIVE: "Ενεργό",
    INACTIVE: "Ανενεργό",
    MATCHED: "Ταιριάστηκε",
    PENDING: "Σε αναμονή",
    CLOSED: "Κλειστό",
    CANCELLED: "Ακυρώθηκε",
    ARCHIVED: "Αρχειοθετημένο",
    IN_PROGRESS: "Σε εξέλιξη",
    COMPLETED: "Ολοκληρώθηκε",
  },
  cz: {
    ACTIVE: "Aktivní",
    INACTIVE: "Neaktivní",
    MATCHED: "Spárováno",
    PENDING: "Čekající",
    CLOSED: "Uzavřeno",
    CANCELLED: "Zrušeno",
    ARCHIVED: "Archivováno",
    IN_PROGRESS: "Probíhající",
    COMPLETED: "Dokončeno",
  },
};

const translations = {
  en: {
    preview: "Request status changed",
    badge: "Status Updated",
    title: "Request Status Changed",
    subtitle: "The status of a request has been updated",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} has updated the status of a request.`,
    requestDetails: "Request Details",
    requestLabel: "Request",
    idLabel: "Request ID",
    fromStatusLabel: "Previous Status",
    toStatusLabel: "New Status",
    ctaButton: "View Request",
    altLink: "Or view at:",
    footer: "You're receiving this because you're involved in this request.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Αλλαγή κατάστασης αιτήματος",
    badge: "Ενημέρωση Κατάστασης",
    title: "Αλλαγή Κατάστασης Αιτήματος",
    subtitle: "Η κατάσταση ενός αιτήματος ενημερώθηκε",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} ενημέρωσε την κατάσταση ενός αιτήματος.`,
    requestDetails: "Λεπτομέρειες Αιτήματος",
    requestLabel: "Αίτημα",
    idLabel: "ID Αιτήματος",
    fromStatusLabel: "Προηγούμενη Κατάσταση",
    toStatusLabel: "Νέα Κατάσταση",
    ctaButton: "Προβολή Αιτήματος",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή συμμετέχετε σε αυτό το αίτημα.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Stav požadavku změněn",
    badge: "Stav Aktualizován",
    title: "Stav Požadavku Změněn",
    subtitle: "Stav požadavku byl aktualizován",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} aktualizoval stav požadavku.`,
    requestDetails: "Detaily Požadavku",
    requestLabel: "Požadavek",
    idLabel: "ID Požadavku",
    fromStatusLabel: "Předchozí Stav",
    toStatusLabel: "Nový Stav",
    ctaButton: "Zobrazit Požadavek",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože se účastníte tohoto požadavku.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

const resolveStatusLabel = (status: string | undefined, lang: string): string => {
  if (!status) return "—";
  const langLabels = statusLabels[lang] || statusLabels.en;
  return langLabels[status] || status;
};

export const RequestStatusChangedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: RequestStatusChangedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const requestUrl = `${baseUrl}/app/requests/${entityId}`;

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon="🔄"
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
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.requestLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0">
              {entityName}
            </Text>
          </Section>
        )}

        {metadata?.friendlyId && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.idLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              {metadata.friendlyId}
            </Text>
          </Section>
        )}

        {metadata?.fromStatus && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.fromStatusLabel}
            </Text>
            <span className="inline-block text-xs font-semibold px-2 py-1 rounded border bg-zinc-50 text-zinc-600 border-zinc-200">
              {resolveStatusLabel(metadata.fromStatus, userLanguage)}
            </span>
          </Section>
        )}

        {metadata?.toStatus && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.toStatusLabel}
            </Text>
            <span className="inline-block text-xs font-semibold px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">
              {resolveStatusLabel(metadata.toStatus, userLanguage)}
            </span>
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

export default RequestStatusChangedEmail;
