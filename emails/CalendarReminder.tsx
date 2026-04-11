import {
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  resolveColors,
} from "./components/BaseLayout";

interface CalendarReminderEmailProps {
  eventTitle: string;
  eventDescription?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  reminderMinutes: number;
  minutesLabel: string;
  linkedClients?: Array<{ id: string; displayName: string }>;
  linkedProperties?: Array<{ id: string; property_name: string }>;
  userLanguage: string;
  eventUrl: string;
  userTheme?: string;
}

export default function CalendarReminderEmail({
  eventTitle,
  eventDescription,
  startTime,
  endTime,
  location,
  reminderMinutes,
  minutesLabel,
  linkedClients = [],
  linkedProperties = [],
  userLanguage,
  eventUrl,
  userTheme,
}: CalendarReminderEmailProps) {
  const isGreek = userLanguage === "el";
  const colors = resolveColors(userTheme);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(userLanguage === "el" ? "el-GR" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const previewText = isGreek
    ? `Υπενθύμιση: ${eventTitle} σε ${minutesLabel}`
    : `Reminder: ${eventTitle} in ${minutesLabel}`;

  return (
    <BaseLayout
      previewText={previewText}
      footerText={
        isGreek
          ? "Αυτό είναι ένα αυτόματο email από το σύστημα ημερολογίου."
          : "This is an automated email from the calendar system."
      }
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {isGreek ? "Υπενθύμιση Συμβάντος" : "Event Reminder"}
      </Heading>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {isGreek
          ? `Έχετε ένα προσεχές συμβάν σε ${minutesLabel}:`
          : `You have an upcoming event in ${minutesLabel}:`}
      </Text>

      <Section
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <Heading
          style={{ color: colors.textPrimary }}
          className="text-xl font-bold m-0 mb-4"
        >
          {eventTitle}
        </Heading>

        {eventDescription && (
          <Text style={{ color: colors.textSecondary }} className="text-sm leading-relaxed m-0 mb-4">
            {eventDescription}
          </Text>
        )}

        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mt-4 mb-1">
          {isGreek ? "Ώρα έναρξης:" : "Start Time:"}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-2">
          {formatDate(startTime)}
        </Text>

        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mt-4 mb-1">
          {isGreek ? "Ώρα λήξης:" : "End Time:"}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-2">
          {formatDate(endTime)}
        </Text>

        {location && (
          <>
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mt-4 mb-1">
              {isGreek ? "Τοποθεσία:" : "Location:"}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-2">
              {location}
            </Text>
          </>
        )}

        {linkedClients.length > 0 && (
          <>
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mt-4 mb-1">
              {isGreek ? "Συνδεδεμένοι Πελάτες:" : "Linked Clients:"}
            </Text>
            {linkedClients.map((client) => (
              <Text key={client.id} style={{ color: colors.textSecondary }} className="text-sm m-0 mb-1">
                • {client.displayName}
              </Text>
            ))}
          </>
        )}

        {linkedProperties.length > 0 && (
          <>
            <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase mt-4 mb-1">
              {isGreek ? "Συνδεδεμένες Ιδιοκτησίες:" : "Linked Properties:"}
            </Text>
            {linkedProperties.map((property) => (
              <Text key={property.id} style={{ color: colors.textSecondary }} className="text-sm m-0 mb-1">
                • {property.property_name}
              </Text>
            ))}
          </>
        )}
      </Section>

      <Section className="text-center mb-6">
        <Link
          href={eventUrl}
          style={{
            backgroundColor: colors.buttonBg,
            color: colors.buttonText,
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
            display: "inline-block",
            padding: "12px 24px",
          }}
        >
          {isGreek ? "Προβολή Ημερολογίου" : "View Calendar"}
        </Link>
      </Section>
    </BaseLayout>
  );
}
