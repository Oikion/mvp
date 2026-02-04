/**
 * Mock Client Data Generator
 */

import { faker } from "@faker-js/faker";
import { fakerEL } from "@faker-js/faker";

export interface MockClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string | null;
  status: "ACTIVE" | "INACTIVE" | "PROSPECT" | "LEAD";
  source: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  } | null;
  preferredLocations: string[];
  notes: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT", "LEAD"] as const;
const CLIENT_SOURCES = [
  "Website",
  "Referral",
  "Walk-in",
  "Social Media",
  "Advertisement",
  "xe.gr",
  "spitogatos.gr",
];

const GREEK_AREAS = [
  "Κολωνάκι",
  "Γλυφάδα",
  "Κηφισιά",
  "Μαρούσι",
  "Παγκράτι",
  "Χαλάνδρι",
  "Βούλα",
  "Πειραιάς",
  "Νέα Σμύρνη",
  "Περιστέρι",
  "Θεσσαλονίκη",
  "Χανιά",
  "Ηράκλειο",
  "Ρόδος",
];

/**
 * Generate mock client data
 */
export function generateMockClients(
  count: number,
  locale: "en" | "el" = "en"
): MockClient[] {
  const f = locale === "el" ? fakerEL : faker;
  const clients: MockClient[] = [];

  for (let i = 0; i < count; i++) {
    const createdAt = f.date.past({ years: 2 });
    const hasBudget = f.datatype.boolean(0.7);
    const hasCompany = f.datatype.boolean(0.3);

    clients.push({
      id: `demo_client_${f.string.uuid()}`,
      firstName: f.person.firstName(),
      lastName: f.person.lastName(),
      email: f.internet.email().toLowerCase(),
      phone: locale === "el" 
        ? `+30 69${f.string.numeric(8)}` 
        : f.phone.number(),
      company: hasCompany ? f.company.name() : null,
      status: f.helpers.arrayElement(CLIENT_STATUSES),
      source: f.helpers.arrayElement(CLIENT_SOURCES),
      budget: hasBudget
        ? {
            min: f.number.int({ min: 50000, max: 200000 }),
            max: f.number.int({ min: 200000, max: 1000000 }),
            currency: "EUR",
          }
        : null,
      preferredLocations: f.helpers.arrayElements(
        GREEK_AREAS,
        f.number.int({ min: 1, max: 3 })
      ),
      notes: f.datatype.boolean(0.5)
        ? f.lorem.sentences({ min: 1, max: 3 })
        : null,
      assignedTo: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
      createdAt: createdAt.toISOString(),
      updatedAt: f.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });
  }

  return clients;
}
