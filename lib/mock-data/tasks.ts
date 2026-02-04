/**
 * Mock Task Data Generator
 */

import { faker } from "@faker-js/faker";
import { fakerEL } from "@faker-js/faker";

export interface MockTask {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  linkedProperty: {
    id: string;
    title: string;
  } | null;
  linkedClient: {
    id: string;
    name: string;
  } | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const TASK_TITLES: Record<string, { en: string[]; el: string[] }> = {
  property: {
    en: [
      "Update property listing photos",
      "Schedule property viewing",
      "Get energy certificate",
      "Prepare property documents",
      "Contact property owner",
      "Review property valuation",
      "Arrange property inspection",
      "Update property description",
    ],
    el: [
      "Ενημέρωση φωτογραφιών αγγελίας",
      "Προγραμματισμός επίδειξης",
      "Έκδοση ενεργειακού πιστοποιητικού",
      "Προετοιμασία εγγράφων ακινήτου",
      "Επικοινωνία με ιδιοκτήτη",
      "Έλεγχος εκτίμησης αξίας",
      "Κανονισμός επιθεώρησης",
      "Ενημέρωση περιγραφής ακινήτου",
    ],
  },
  client: {
    en: [
      "Follow up with client",
      "Send property options to client",
      "Schedule client meeting",
      "Prepare offer for client",
      "Client credit check",
      "Send contract to client",
      "Client feedback call",
      "Update client requirements",
    ],
    el: [
      "Επικοινωνία με πελάτη",
      "Αποστολή επιλογών ακινήτων",
      "Προγραμματισμός συνάντησης",
      "Προετοιμασία προσφοράς",
      "Έλεγχος πιστοληπτικότητας",
      "Αποστολή συμβολαίου",
      "Τηλέφωνο για feedback",
      "Ενημέρωση απαιτήσεων πελάτη",
    ],
  },
  admin: {
    en: [
      "Complete monthly report",
      "Update CRM records",
      "Review pending contracts",
      "Team performance review",
      "Update pricing strategy",
      "Market analysis report",
      "Invoice follow-up",
      "Update company listings",
    ],
    el: [
      "Μηνιαία αναφορά",
      "Ενημέρωση αρχείων CRM",
      "Έλεγχος εκκρεμών συμβολαίων",
      "Αξιολόγηση απόδοσης ομάδας",
      "Ενημέρωση τιμολογιακής πολιτικής",
      "Αναφορά ανάλυσης αγοράς",
      "Παρακολούθηση τιμολογίων",
      "Ενημέρωση αγγελιών εταιρείας",
    ],
  },
};

const TASK_TAGS = [
  "urgent",
  "follow-up",
  "documentation",
  "viewing",
  "negotiation",
  "contract",
  "inspection",
  "photos",
];

/**
 * Generate mock task data
 */
export function generateMockTasks(
  count: number,
  locale: "en" | "el" = "en"
): MockTask[] {
  const f = locale === "el" ? fakerEL : faker;
  const tasks: MockTask[] = [];

  for (let i = 0; i < count; i++) {
    const category = f.helpers.arrayElement(["property", "client", "admin"]);
    const status = f.helpers.arrayElement(TASK_STATUSES);
    const isCompleted = status === "COMPLETED";
    const hasDueDate = f.datatype.boolean(0.8);

    const createdAt = f.date.past({ years: 1 });
    const dueDate = hasDueDate
      ? f.date.between({
          from: createdAt,
          to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
      : null;

    const hasProperty = category === "property" || f.datatype.boolean(0.3);
    const hasClient = category === "client" || f.datatype.boolean(0.4);

    tasks.push({
      id: `demo_task_${f.string.uuid()}`,
      title: f.helpers.arrayElement(TASK_TITLES[category][locale]),
      description: f.datatype.boolean(0.6)
        ? f.lorem.sentences({ min: 1, max: 3 })
        : null,
      priority: f.helpers.weightedArrayElement([
        { value: "LOW" as const, weight: 0.2 },
        { value: "MEDIUM" as const, weight: 0.4 },
        { value: "HIGH" as const, weight: 0.3 },
        { value: "URGENT" as const, weight: 0.1 },
      ]),
      status,
      dueDate: dueDate?.toISOString() || null,
      completedAt: isCompleted
        ? f.date.between({ from: createdAt, to: new Date() }).toISOString()
        : null,
      assignedTo: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
      createdBy: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
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
      tags: f.helpers.arrayElements(TASK_TAGS, f.number.int({ min: 0, max: 3 })),
      createdAt: createdAt.toISOString(),
      updatedAt: f.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });
  }

  return tasks;
}
