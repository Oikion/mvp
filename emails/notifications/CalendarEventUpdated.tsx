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

type EventAction = "CREATED" | "UPDATED" | "CANCELLED";

interface CalendarEventUpdatedEmailProps {
  recipientName: string;
  actorName: string;
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  action: EventAction;
  userLanguage: string;
  userTheme?: string;
}

const actionConfig: Record<EventAction, { icon: string; color: string }> = {
  CREATED: { icon: "📅", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  UPDATED: { icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-200" },
  CANCELLED: { icon: "✕", color: "bg-red-50 text-red-700 border-red-200" },
};

const translations = {
  en: {
    preview: {
      CREATED: "New calendar event created",
      UPDATED: "Calendar event updated",
      CANCELLED: "Calendar event cancelled",
    },
    badge: {
      CREATED: "New Event",
      UPDATED: "Event Updated",
      CANCELLED: "Event Cancelled",
    },
    title: {
      CREATED: "New Calendar Event",
      UPDATED: "Event Updated",
      CANCELLED: "Event Cancelled",
    },
    subtitle: {
      CREATED: "A new event has been added to your calendar",
      UPDATED: "An event you're invited to has been updated",
      CANCELLED: "An event has been cancelled",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      CREATED: (actor: string) => `${actor} has created a new calendar event.`,
      UPDATED: (actor: string) => `${actor} has updated an event you're invited to.`,
      CANCELLED: (actor: string) => `${actor} has cancelled this event. It will no longer take place.`,
    },
    eventDetails: "Event Details",
    titleLabel: "Event",
    descriptionLabel: "Description",
    startTimeLabel: "Start Time",
    endTimeLabel: "End Time",
    locationLabel: "Location",
    ctaButton: "View Calendar",
    altLink: "Or view at:",
    footer: "You're receiving this because of changes to an event you're invited to.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      CREATED: "Νέα εκδήλωση ημερολογίου δημιουργήθηκε",
      UPDATED: "Η εκδήλωση ημερολογίου ενημερώθηκε",
      CANCELLED: "Η εκδήλωση ημερολογίου ακυρώθηκε",
    },
    badge: {
      CREATED: "Νέα Εκδήλωση",
      UPDATED: "Εκδήλωση Ενημερώθηκε",
      CANCELLED: "Εκδήλωση Ακυρώθηκε",
    },
    title: {
      CREATED: "Νέα Εκδήλωση Ημερολογίου",
      UPDATED: "Η Εκδήλωση Ενημερώθηκε",
      CANCELLED: "Η Εκδήλωση Ακυρώθηκε",
    },
    subtitle: {
      CREATED: "Μια νέα εκδήλωση προστέθηκε στο ημερολόγιό σας",
      UPDATED: "Μια εκδήλωση στην οποία έχετε προσκληθεί ενημερώθηκε",
      CANCELLED: "Μια εκδήλωση ακυρώθηκε",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      CREATED: (actor: string) => `Ο/Η ${actor} δημιούργησε μια νέα εκδήλωση ημερολογίου.`,
      UPDATED: (actor: string) => `Ο/Η ${actor} ενημέρωσε μια εκδήλωση στην οποία έχετε προσκληθεί.`,
      CANCELLED: (actor: string) => `Ο/Η ${actor} ακύρωσε αυτή την εκδήλωση. Δεν θα πραγματοποιηθεί πλέον.`,
    },
    eventDetails: "Λεπτομέρειες Εκδήλωσης",
    titleLabel: "Εκδήλωση",
    descriptionLabel: "Περιγραφή",
    startTimeLabel: "Ώρα Έναρξης",
    endTimeLabel: "Ώρα Λήξης",
    locationLabel: "Τοποθεσία",
    ctaButton: "Προβολή Ημερολογίου",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό λόγω αλλαγών σε μια εκδήλωση στην οποία έχετε προσκληθεί.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      CREATED: "Nová kalendářní událost vytvořena",
      UPDATED: "Kalendářní událost aktualizována",
      CANCELLED: "Kalendářní událost zrušena",
    },
    badge: {
      CREATED: "Nová Událost",
      UPDATED: "Událost Aktualizována",
      CANCELLED: "Událost Zrušena",
    },
    title: {
      CREATED: "Nová Kalendářní Událost",
      UPDATED: "Událost Aktualizována",
      CANCELLED: "Událost Zrušena",
    },
    subtitle: {
      CREATED: "Nová událost byla přidána do vašeho kalendáře",
      UPDATED: "Událost, na kterou jste pozváni, byla aktualizována",
      CANCELLED: "Událost byla zrušena",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      CREATED: (actor: string) => `${actor} vytvořil novou kalendářní událost.`,
      UPDATED: (actor: string) => `${actor} aktualizoval událost, na kterou jste pozváni.`,
      CANCELLED: (actor: string) => `${actor} zrušil tuto událost. Již se neuskuteční.`,
    },
    eventDetails: "Detaily Události",
    titleLabel: "Událost",
    descriptionLabel: "Popis",
    startTimeLabel: "Čas Zahájení",
    endTimeLabel: "Čas Ukončení",
    locationLabel: "Místo",
    ctaButton: "Zobrazit Kalendář",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte kvůli změnám u události, na kterou jste pozváni.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const CalendarEventUpdatedEmail = ({
  recipientName,
  actorName,
  eventId,
  eventTitle,
  eventDescription,
  startTime,
  endTime,
  location,
  action,
  userLanguage,
  userTheme,
}: CalendarEventUpdatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const actionStyle = actionConfig[action];
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
      previewText={t.preview[action]}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon={actionStyle.icon}
        text={t.badge[action]}
        colorClass={actionStyle.color}
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title[action]}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle[action]}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro[action](actorName)}
      </Text>

      {/* Event Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.eventDetails}
        </Text>

        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.titleLabel}
          </Text>
          <Text
            style={{ color: action === "CANCELLED" ? colors.textMuted : colors.textPrimary }}
            className={`text-lg font-semibold m-0 ${action === "CANCELLED" ? "line-through" : ""}`}
          >
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
          <Text
            style={{ color: action === "CANCELLED" ? colors.textMuted : colors.textPrimary }}
            className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through" : ""}`}
          >
            {formatDateTime(startTime)}
          </Text>
        </Section>

        <Section className="mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.endTimeLabel}
          </Text>
          <Text
            style={{ color: action === "CANCELLED" ? colors.textMuted : colors.textPrimary }}
            className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through" : ""}`}
          >
            {formatDateTime(endTime)}
          </Text>
        </Section>

        {location && (
          <Section>
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.locationLabel}
            </Text>
            <Text
              style={{ color: action === "CANCELLED" ? colors.textMuted : colors.textPrimary }}
              className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through" : ""}`}
            >
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

export default CalendarEventUpdatedEmail;
