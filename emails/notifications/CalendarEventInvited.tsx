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

interface CalendarEventInvitedEmailProps {
  recipientName: string;
  inviterName: string;
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (inviter: string) => `${inviter} invited you to an event`,
    badge: "Event Invitation",
    title: "You're Invited!",
    subtitle: "A new calendar event awaits your response",
    greeting: (name: string) => `Hello ${name},`,
    intro: (inviter: string) => `${inviter} has invited you to a calendar event on Oikion.`,
    eventDetails: "Event Details",
    titleLabel: "Event",
    descriptionLabel: "Description",
    startTimeLabel: "Start Time",
    endTimeLabel: "End Time",
    locationLabel: "Location",
    ctaButton: "View Event",
    altLink: "Or view at:",
    footer: "You're receiving this because you were invited to an event.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (inviter: string) => `Ο/Η ${inviter} σας προσκάλεσε σε μια εκδήλωση`,
    badge: "Πρόσκληση Εκδήλωσης",
    title: "Έχετε Πρόσκληση!",
    subtitle: "Μια νέα εκδήλωση ημερολογίου περιμένει την απάντησή σας",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (inviter: string) => `Ο/Η ${inviter} σας προσκάλεσε σε μια εκδήλωση ημερολογίου στο Oikion.`,
    eventDetails: "Λεπτομέρειες Εκδήλωσης",
    titleLabel: "Εκδήλωση",
    descriptionLabel: "Περιγραφή",
    startTimeLabel: "Ώρα Έναρξης",
    endTimeLabel: "Ώρα Λήξης",
    locationLabel: "Τοποθεσία",
    ctaButton: "Προβολή Εκδήλωσης",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή προσκληθήκατε σε μια εκδήλωση.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (inviter: string) => `${inviter} vás pozval na událost`,
    badge: "Pozvánka na Událost",
    title: "Jste Pozváni!",
    subtitle: "Nová kalendářní událost čeká na vaši odpověď",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (inviter: string) => `${inviter} vás pozval na kalendářní událost na Oikionu.`,
    eventDetails: "Detaily Události",
    titleLabel: "Událost",
    descriptionLabel: "Popis",
    startTimeLabel: "Čas Zahájení",
    endTimeLabel: "Čas Ukončení",
    locationLabel: "Místo",
    ctaButton: "Zobrazit Událost",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože jste byli pozváni na událost.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const CalendarEventInvitedEmail = ({
  recipientName,
  inviterName,
  eventId,
  eventTitle,
  eventDescription,
  startTime,
  endTime,
  location,
  userLanguage,
  userTheme,
}: CalendarEventInvitedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const eventUrl = `${baseUrl}/app/calendar?event=${eventId}`;

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(userLanguage === "el" ? "el-GR" : userLanguage === "cz" ? "cs-CZ" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <BaseLayout
      previewText={t.preview(inviterName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="📅"
        text={t.badge}
        colorClass="bg-indigo-50 text-indigo-700 border-indigo-200"
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
        {t.intro(inviterName)}
      </Text>

      {/* Event Details Card */}
      <Section className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
        <Text className="text-indigo-700 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.eventDetails}
        </Text>

        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.titleLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
            {eventTitle}
          </Text>
        </Section>

        {eventDescription && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.descriptionLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed">
              {eventDescription.length > 200
                ? `${eventDescription.substring(0, 200)}...`
                : eventDescription}
            </Text>
          </Section>
        )}

        <Section className="mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.startTimeLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
            {formatDateTime(startTime)}
          </Text>
        </Section>

        <Section className="mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.endTimeLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
            {formatDateTime(endTime)}
          </Text>
        </Section>

        {location && (
          <Section>
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.locationLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              📍 {location}
            </Text>
          </Section>
        )}
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={eventUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={eventUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {eventUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default CalendarEventInvitedEmail;
