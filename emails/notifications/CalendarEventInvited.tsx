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
}: CalendarEventInvitedEmailProps) => {
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
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(inviterName)}</Preview>
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
                <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-200">
                  📅 {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(inviterName)}
              </Text>

              {/* Event Details Card */}
              <Section className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
                <Text className="text-indigo-700 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.eventDetails}
                </Text>

                {/* Event Title */}
                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.titleLabel}
                  </Text>
                  <Text className="text-zinc-900 text-lg font-semibold m-0">
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
                  <Text className="text-zinc-900 text-sm font-medium m-0">
                    {formatDateTime(startTime)}
                  </Text>
                </Section>

                {/* End Time */}
                <Section className="mb-3">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.endTimeLabel}
                  </Text>
                  <Text className="text-zinc-900 text-sm font-medium m-0">
                    {formatDateTime(endTime)}
                  </Text>
                </Section>

                {/* Location */}
                {location && (
                  <Section>
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.locationLabel}
                    </Text>
                    <Text className="text-zinc-900 text-sm font-medium m-0">
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

export default CalendarEventInvitedEmail;
