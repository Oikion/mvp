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

interface ShowingScheduledEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  metadata?: {
    propertyName?: string;
    propertyAddress?: string;
    scheduledAt?: Date | string;
    contactName?: string;
    friendlyId?: string;
    notes?: string;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const translations = {
  en: {
    preview: "New showing scheduled",
    badge: "Showing Scheduled",
    title: "A New Showing Has Been Scheduled",
    subtitle: "A property showing has been arranged",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} has scheduled a new property showing.`,
    showingDetails: "Showing Details",
    propertyLabel: "Property",
    addressLabel: "Address",
    dateLabel: "Scheduled For",
    contactLabel: "Contact / Prospect",
    notesLabel: "Notes",
    idLabel: "Showing ID",
    ctaButton: "View Showing",
    altLink: "Or view at:",
    footer: "You're receiving this because a showing was scheduled for a property you're involved with.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Νέα επίσκεψη προγραμματίστηκε",
    badge: "Επίσκεψη Προγραμματίστηκε",
    title: "Νέα Επίσκεψη Προγραμματίστηκε",
    subtitle: "Προγραμματίστηκε επίσκεψη ακινήτου",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} προγραμμάτισε νέα επίσκεψη ακινήτου.`,
    showingDetails: "Λεπτομέρειες Επίσκεψης",
    propertyLabel: "Ακίνητο",
    addressLabel: "Διεύθυνση",
    dateLabel: "Προγραμματισμένη για",
    contactLabel: "Επαφή / Υποψήφιος",
    notesLabel: "Σημειώσεις",
    idLabel: "ID Επίσκεψης",
    ctaButton: "Προβολή Επίσκεψης",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή έχει προγραμματιστεί επίσκεψη για ακίνητο που αφορά εσάς.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Nová prohlídka naplánována",
    badge: "Prohlídka Naplánována",
    title: "Nová Prohlídka Naplánována",
    subtitle: "Prohlídka nemovitosti byla naplánována",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} naplánoval novou prohlídku nemovitosti.`,
    showingDetails: "Detaily Prohlídky",
    propertyLabel: "Nemovitost",
    addressLabel: "Adresa",
    dateLabel: "Naplánováno na",
    contactLabel: "Kontakt / Zájemce",
    notesLabel: "Poznámky",
    idLabel: "ID Prohlídky",
    ctaButton: "Zobrazit Prohlídku",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože byla naplánována prohlídka nemovitosti, které se účastníte.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

const formatDate = (date: Date | string | undefined, lang: string): string => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const locale = lang === "el" ? "el-GR" : lang === "cz" ? "cs-CZ" : "en-US";
  return d.toLocaleString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ShowingScheduledEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: ShowingScheduledEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const showingUrl = `${baseUrl}/app/showings/${entityId}`;
  const propertyName = metadata?.propertyName || entityName;

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon="🏠"
        text={t.badge}
        colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
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

      {/* Showing Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.showingDetails}
        </Text>

        {propertyName && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.propertyLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0">
              🏠 {propertyName}
            </Text>
          </Section>
        )}

        {metadata?.propertyAddress && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.addressLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0">
              📍 {metadata.propertyAddress}
            </Text>
          </Section>
        )}

        {metadata?.scheduledAt && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.dateLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0">
              🗓 {formatDate(metadata.scheduledAt, userLanguage)}
            </Text>
          </Section>
        )}

        {metadata?.contactName && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.contactLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              👤 {metadata.contactName}
            </Text>
          </Section>
        )}

        {metadata?.notes && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.notesLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed">
              {metadata.notes.length > 150 ? `${metadata.notes.substring(0, 150)}...` : metadata.notes}
            </Text>
          </Section>
        )}
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={showingUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={showingUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {showingUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ShowingScheduledEmail;
