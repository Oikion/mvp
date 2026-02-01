/**
 * Mock Calendar Event Data Generator
 */

import { faker } from "@faker-js/faker";
import { fakerEL } from "@faker-js/faker";

export interface MockCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: "VIEWING" | "MEETING" | "CALL" | "TASK" | "OTHER";
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string | null;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    status: "ACCEPTED" | "DECLINED" | "PENDING";
  }>;
  linkedProperty: {
    id: string;
    title: string;
  } | null;
  linkedClient: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

const EVENT_TYPES = ["VIEWING", "MEETING", "CALL", "TASK", "OTHER"] as const;
const EVENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
const PARTICIPANT_STATUSES = ["ACCEPTED", "DECLINED", "PENDING"] as const;

const EVENT_TITLES: Record<string, { en: string[]; el: string[] }> = {
  VIEWING: {
    en: [
      "Property Viewing",
      "Show apartment to client",
      "House tour",
      "Open house",
      "Second viewing",
    ],
    el: [
      "Επίδειξη ακινήτου",
      "Επίσκεψη διαμερίσματος",
      "Παρουσίαση σπιτιού",
      "Ανοιχτή επίσκεψη",
      "Δεύτερη επίδειξη",
    ],
  },
  MEETING: {
    en: [
      "Client meeting",
      "Offer discussion",
      "Contract signing",
      "Team meeting",
      "Negotiation",
    ],
    el: [
      "Συνάντηση με πελάτη",
      "Συζήτηση προσφοράς",
      "Υπογραφή συμβολαίου",
      "Συνάντηση ομάδας",
      "Διαπραγμάτευση",
    ],
  },
  CALL: {
    en: [
      "Follow-up call",
      "Initial consultation",
      "Price discussion",
      "Client check-in",
      "Feedback call",
    ],
    el: [
      "Τηλέφωνο παρακολούθησης",
      "Αρχική διαβούλευση",
      "Συζήτηση τιμής",
      "Επικοινωνία με πελάτη",
      "Τηλέφωνο για feedback",
    ],
  },
  TASK: {
    en: [
      "Prepare documents",
      "Update listing",
      "Photo shoot",
      "Market analysis",
      "Energy certificate",
    ],
    el: [
      "Προετοιμασία εγγράφων",
      "Ενημέρωση αγγελίας",
      "Φωτογράφηση",
      "Ανάλυση αγοράς",
      "Ενεργειακό πιστοποιητικό",
    ],
  },
  OTHER: {
    en: ["Reminder", "Personal", "Training", "Conference", "Webinar"],
    el: ["Υπενθύμιση", "Προσωπικό", "Εκπαίδευση", "Συνέδριο", "Webinar"],
  },
};

const GREEK_ADDRESSES = [
  "Βασιλίσσης Σοφίας 15, Αθήνα",
  "Τσιμισκή 45, Θεσσαλονίκη",
  "Λεωφ. Κηφισίας 120, Μαρούσι",
  "Ερμού 78, Αθήνα",
  "Ποσειδώνος 22, Γλυφάδα",
];

/**
 * Generate mock calendar event data
 */
export function generateMockCalendarEvents(
  count: number,
  locale: "en" | "el" = "en"
): MockCalendarEvent[] {
  const f = locale === "el" ? fakerEL : faker;
  const events: MockCalendarEvent[] = [];

  for (let i = 0; i < count; i++) {
    const eventType = f.helpers.arrayElement(EVENT_TYPES);
    const isAllDay = f.datatype.boolean(0.1);
    const isPast = f.datatype.boolean(0.3);

    // Generate start time
    const startDate = isPast
      ? f.date.recent({ days: 30 })
      : f.date.soon({ days: 30 });

    // Set to a reasonable hour
    startDate.setHours(f.number.int({ min: 9, max: 18 }), 0, 0, 0);

    // Generate end time (30 min to 2 hours after start)
    const durationMinutes = f.helpers.arrayElement([30, 60, 90, 120]);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const hasProperty = f.datatype.boolean(0.6);
    const hasClient = f.datatype.boolean(0.7);
    const participantCount = f.number.int({ min: 0, max: 3 });

    const createdAt = f.date.past({ years: 1 });

    events.push({
      id: `demo_event_${f.string.uuid()}`,
      title: f.helpers.arrayElement(EVENT_TITLES[eventType][locale]),
      description: f.datatype.boolean(0.6) ? f.lorem.sentences({ min: 1, max: 2 }) : null,
      eventType,
      startTime: startDate.toISOString(),
      endTime: isAllDay ? startDate.toISOString() : endDate.toISOString(),
      isAllDay,
      location: f.datatype.boolean(0.5)
        ? locale === "el"
          ? f.helpers.arrayElement(GREEK_ADDRESSES)
          : f.location.streetAddress({ useFullAddress: true })
        : null,
      participants: Array.from({ length: participantCount }, () => ({
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
        status: f.helpers.arrayElement(PARTICIPANT_STATUSES),
      })),
      linkedProperty: hasProperty
        ? {
            id: `demo_property_${f.string.uuid()}`,
            title: `${f.helpers.arrayElement(["Apartment", "House", "Villa"])} in ${f.helpers.arrayElement(["Kolonaki", "Glyfada", "Kifisia"])}`,
          }
        : null,
      linkedClient: hasClient
        ? {
            id: `demo_client_${f.string.uuid()}`,
            name: f.person.fullName(),
          }
        : null,
      createdBy: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
      status: isPast
        ? f.helpers.weightedArrayElement([
            { value: "COMPLETED" as const, weight: 0.7 },
            { value: "CANCELLED" as const, weight: 0.3 },
          ])
        : "SCHEDULED",
      createdAt: createdAt.toISOString(),
      updatedAt: f.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });
  }

  // Sort by start time
  return events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}
