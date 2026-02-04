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
}: CalendarEventUpdatedEmailProps) => {
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
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview[action]}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${actionStyle.color}`}>
                  {actionStyle.icon} {t.badge[action]}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title[action]}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle[action]}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro[action](actorName)}
              </Text>

              {/* Event Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.eventDetails}
                </Text>

                {/* Event Title */}
                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.titleLabel}
                  </Text>
                  <Text className={`text-lg font-semibold m-0 ${action === "CANCELLED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                    {eventTitle}
                  </Text>
                </Section>

                {/* Event Description */}
                {eventDescription && (
                  <Section className="mb-4">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.descriptionLabel}
                    </Text>
                    <Text className="text-zinc-700 text-sm m-0 leading-relaxed">
                      {eventDescription.length > 200 
                        ? `${eventDescription.substring(0, 200)}...` 
                        : eventDescription}
                    </Text>
                  </Section>
                )}

                {/* Start Time */}
                <Section className="mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.startTimeLabel}
                  </Text>
                  <Text className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                    {formatDateTime(startTime)}
                  </Text>
                </Section>

                {/* End Time */}
                <Section className="mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.endTimeLabel}
                  </Text>
                  <Text className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                    {formatDateTime(endTime)}
                  </Text>
                </Section>

                {/* Location */}
                {location && (
                  <Section>
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.locationLabel}
                    </Text>
                    <Text className={`text-sm font-medium m-0 ${action === "CANCELLED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                      📍 {location}
                    </Text>
                  </Section>
                )}
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={eventUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={eventUrl} className="text-blue-600 text-xs underline break-all">
                  {eventUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer} {t.footerNote}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CalendarEventUpdatedEmail;
