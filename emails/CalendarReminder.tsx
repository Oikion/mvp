import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface CalendarReminderEmailProps {
  eventTitle: string;
  eventDescription?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  reminderMinutes: number;
  minutesLabel: string;
  linkedClients?: Array<{ id: string; client_name: string }>;
  linkedProperties?: Array<{ id: string; property_name: string }>;
  userLanguage: string;
  eventUrl: string;
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
}: CalendarReminderEmailProps) {
  const isGreek = userLanguage === "el";
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

  return (
    <Html>
      <Head />
      <Preview>
        {isGreek
          ? `Υπενθύμιση: ${eventTitle} σε ${minutesLabel}`
          : `Reminder: ${eventTitle} in ${minutesLabel}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isGreek ? "Υπενθύμιση Συμβάντος" : "Event Reminder"}
          </Heading>

          <Text style={text}>
            {isGreek
              ? `Έχετε ένα προσεχές συμβάν σε ${minutesLabel}:`
              : `You have an upcoming event in ${minutesLabel}:`}
          </Text>

          <Section style={eventBox}>
            <Heading style={h2}>{eventTitle}</Heading>

            {eventDescription && (
              <Text style={description}>{eventDescription}</Text>
            )}

            <Text style={timeLabel}>
              {isGreek ? "Ώρα έναρξης:" : "Start Time:"}
            </Text>
            <Text style={time}>{formatDate(startTime)}</Text>

            <Text style={timeLabel}>
              {isGreek ? "Ώρα λήξης:" : "End Time:"}
            </Text>
            <Text style={time}>{formatDate(endTime)}</Text>

            {location && (
              <>
                <Text style={timeLabel}>
                  {isGreek ? "Τοποθεσία:" : "Location:"}
                </Text>
                <Text style={time}>{location}</Text>
              </>
            )}

            {linkedClients.length > 0 && (
              <>
                <Text style={timeLabel}>
                  {isGreek ? "Συνδεδεμένοι Πελάτες:" : "Linked Clients:"}
                </Text>
                {linkedClients.map((client) => (
                  <Text key={client.id} style={linkText}>
                    • {client.client_name}
                  </Text>
                ))}
              </>
            )}

            {linkedProperties.length > 0 && (
              <>
                <Text style={timeLabel}>
                  {isGreek ? "Συνδεδεμένες Ιδιοκτησίες:" : "Linked Properties:"}
                </Text>
                {linkedProperties.map((property) => (
                  <Text key={property.id} style={linkText}>
                    • {property.property_name}
                  </Text>
                ))}
              </>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Link href={eventUrl} style={button}>
              {isGreek ? "Προβολή Ημερολογίου" : "View Calendar"}
            </Link>
          </Section>

          <Text style={footer}>
            {isGreek
              ? "Αυτό είναι ένα αυτόματο email από το σύστημα ημερολογίου."
              : "This is an automated email from the calendar system."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
};

const h2 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  marginBottom: "24px",
};

const eventBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const description = {
  color: "#666",
  fontSize: "14px",
  lineHeight: "22px",
  marginBottom: "16px",
};

const timeLabel: React.CSSProperties = {
  color: "#666",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  marginTop: "16px",
  marginBottom: "4px",
};

const time = {
  color: "#333",
  fontSize: "16px",
  fontWeight: "500",
  marginBottom: "8px",
};

const linkText = {
  color: "#333",
  fontSize: "14px",
  marginLeft: "8px",
  marginBottom: "4px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  marginTop: "32px",
  textAlign: "center" as const,
};





