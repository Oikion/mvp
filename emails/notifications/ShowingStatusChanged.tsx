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

type ShowingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

interface ShowingStatusChangedEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  status: ShowingStatus;
  metadata?: {
    propertyName?: string;
    propertyAddress?: string;
    scheduledAt?: Date | string;
    contactName?: string;
    notes?: string;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const statusConfig: Record<ShowingStatus, { icon: string; colorClass: string }> = {
  CONFIRMED: { icon: "✓", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { icon: "✕", colorClass: "bg-red-50 text-red-700 border-red-200" },
  COMPLETED: { icon: "🎉", colorClass: "bg-green-50 text-green-700 border-green-200" },
  NO_SHOW: { icon: "⚠", colorClass: "bg-amber-50 text-amber-700 border-amber-200" },
};

const translations = {
  en: {
    statuses: {
      CONFIRMED: {
        preview: "Showing confirmed",
        badge: "Showing Confirmed",
        title: "Showing Confirmed",
        subtitle: "The property showing has been confirmed",
        intro: (actor: string) => `${actor} has confirmed the showing.`,
      },
      CANCELLED: {
        preview: "Showing cancelled",
        badge: "Showing Cancelled",
        title: "Showing Cancelled",
        subtitle: "The property showing has been cancelled",
        intro: (actor: string) => `${actor} has cancelled the showing.`,
      },
      COMPLETED: {
        preview: "Showing completed",
        badge: "Showing Completed",
        title: "Showing Completed",
        subtitle: "The property showing has been marked as completed",
        intro: (actor: string) => `${actor} has marked the showing as completed.`,
      },
      NO_SHOW: {
        preview: "Showing no-show recorded",
        badge: "No-Show Recorded",
        title: "No-Show Recorded",
        subtitle: "The contact did not attend the scheduled showing",
        intro: (actor: string) => `${actor} recorded a no-show for the showing.`,
      },
    },
    greeting: (name: string) => `Hello ${name},`,
    showingDetails: "Showing Details",
    propertyLabel: "Property",
    addressLabel: "Address",
    dateLabel: "Scheduled For",
    contactLabel: "Contact",
    notesLabel: "Notes",
    ctaButton: "View Showing",
    altLink: "Or view at:",
    footer: "You're receiving this because of an update to a showing you're involved with.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    statuses: {
      CONFIRMED: {
        preview: "Επίσκεψη επιβεβαιώθηκε",
        badge: "Επίσκεψη Επιβεβαιώθηκε",
        title: "Επίσκεψη Επιβεβαιώθηκε",
        subtitle: "Η επίσκεψη ακινήτου επιβεβαιώθηκε",
        intro: (actor: string) => `Ο/Η ${actor} επιβεβαίωσε την επίσκεψη.`,
      },
      CANCELLED: {
        preview: "Επίσκεψη ακυρώθηκε",
        badge: "Επίσκεψη Ακυρώθηκε",
        title: "Επίσκεψη Ακυρώθηκε",
        subtitle: "Η επίσκεψη ακινήτου ακυρώθηκε",
        intro: (actor: string) => `Ο/Η ${actor} ακύρωσε την επίσκεψη.`,
      },
      COMPLETED: {
        preview: "Επίσκεψη ολοκληρώθηκε",
        badge: "Επίσκεψη Ολοκληρώθηκε",
        title: "Επίσκεψη Ολοκληρώθηκε",
        subtitle: "Η επίσκεψη ακινήτου σημειώθηκε ως ολοκληρωμένη",
        intro: (actor: string) => `Ο/Η ${actor} σημείωσε την επίσκεψη ως ολοκληρωμένη.`,
      },
      NO_SHOW: {
        preview: "Απουσία από επίσκεψη",
        badge: "Απουσία Καταχωρήθηκε",
        title: "Απουσία Καταχωρήθηκε",
        subtitle: "Η επαφή δεν παρουσιάστηκε στην προγραμματισμένη επίσκεψη",
        intro: (actor: string) => `Ο/Η ${actor} κατέγραψε απουσία για την επίσκεψη.`,
      },
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    showingDetails: "Λεπτομέρειες Επίσκεψης",
    propertyLabel: "Ακίνητο",
    addressLabel: "Διεύθυνση",
    dateLabel: "Προγραμματισμένη για",
    contactLabel: "Επαφή",
    notesLabel: "Σημειώσεις",
    ctaButton: "Προβολή Επίσκεψης",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό λόγω ενημέρωσης σε επίσκεψη που αφορά εσάς.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    statuses: {
      CONFIRMED: {
        preview: "Prohlídka potvrzena",
        badge: "Prohlídka Potvrzena",
        title: "Prohlídka Potvrzena",
        subtitle: "Prohlídka nemovitosti byla potvrzena",
        intro: (actor: string) => `${actor} potvrdil prohlídku.`,
      },
      CANCELLED: {
        preview: "Prohlídka zrušena",
        badge: "Prohlídka Zrušena",
        title: "Prohlídka Zrušena",
        subtitle: "Prohlídka nemovitosti byla zrušena",
        intro: (actor: string) => `${actor} zrušil prohlídku.`,
      },
      COMPLETED: {
        preview: "Prohlídka dokončena",
        badge: "Prohlídka Dokončena",
        title: "Prohlídka Dokončena",
        subtitle: "Prohlídka nemovitosti byla označena jako dokončená",
        intro: (actor: string) => `${actor} označil prohlídku jako dokončenou.`,
      },
      NO_SHOW: {
        preview: "Zaznamenána nepřítomnost",
        badge: "Nepřítomnost Zaznamenána",
        title: "Nepřítomnost Zaznamenána",
        subtitle: "Kontakt se nedostavil na naplánovanou prohlídku",
        intro: (actor: string) => `${actor} zaznamenal nepřítomnost na prohlídce.`,
      },
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    showingDetails: "Detaily Prohlídky",
    propertyLabel: "Nemovitost",
    addressLabel: "Adresa",
    dateLabel: "Naplánováno na",
    contactLabel: "Kontakt",
    notesLabel: "Poznámky",
    ctaButton: "Zobrazit Prohlídku",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte z důvodu aktualizace prohlídky, které se účastníte.",
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

export const ShowingStatusChangedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  status,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: ShowingStatusChangedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const statusT = t.statuses[status] || t.statuses.CONFIRMED;
  const statusStyle = statusConfig[status] || statusConfig.CONFIRMED;
  const showingUrl = `${baseUrl}/app/showings/${entityId}`;
  const propertyName = metadata?.propertyName || entityName;

  return (
    <BaseLayout
      previewText={statusT.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon={statusStyle.icon}
        text={statusT.badge}
        colorClass={statusStyle.colorClass}
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {statusT.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {statusT.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {statusT.intro(actorName)}
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
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              🗓 {formatDate(metadata.scheduledAt, userLanguage)}
            </Text>
          </Section>
        )}

        {metadata?.contactName && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.contactLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              👤 {metadata.contactName}
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

export default ShowingStatusChangedEmail;
