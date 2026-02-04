/**
 * Mock Document Data Generator
 */

import { faker } from "@faker-js/faker";
import { fakerEL } from "@faker-js/faker";

export interface MockDocument {
  id: string;
  name: string;
  description: string | null;
  documentType: "CONTRACT" | "DEED" | "CERTIFICATE" | "PHOTO" | "FLOORPLAN" | "OTHER";
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  linkedProperty: {
    id: string;
    title: string;
  } | null;
  linkedClient: {
    id: string;
    name: string;
  } | null;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_TYPES = ["CONTRACT", "DEED", "CERTIFICATE", "PHOTO", "FLOORPLAN", "OTHER"] as const;

const DOCUMENT_NAMES: Record<string, { en: string[]; el: string[] }> = {
  CONTRACT: {
    en: [
      "Sales Agreement",
      "Lease Contract",
      "Purchase Agreement",
      "Rental Agreement",
      "Preliminary Contract",
    ],
    el: [
      "Συμφωνητικό Πώλησης",
      "Μισθωτήριο Συμβόλαιο",
      "Συμβόλαιο Αγοράς",
      "Συμφωνητικό Ενοικίασης",
      "Προσύμφωνο",
    ],
  },
  DEED: {
    en: [
      "Property Deed",
      "Title Deed",
      "Ownership Certificate",
      "Transfer Deed",
    ],
    el: [
      "Συμβόλαιο Ιδιοκτησίας",
      "Τίτλος Ιδιοκτησίας",
      "Πιστοποιητικό Κυριότητας",
      "Συμβόλαιο Μεταβίβασης",
    ],
  },
  CERTIFICATE: {
    en: [
      "Energy Performance Certificate",
      "Building Permit",
      "Tax Certificate",
      "Technical Inspection Report",
      "Property Survey",
    ],
    el: [
      "Ενεργειακό Πιστοποιητικό",
      "Άδεια Οικοδομής",
      "Φορολογική Ενημερότητα",
      "Έκθεση Τεχνικού Ελέγχου",
      "Τοπογραφικό Διάγραμμα",
    ],
  },
  PHOTO: {
    en: [
      "Exterior Photos",
      "Interior Photos",
      "Living Room Photos",
      "Kitchen Photos",
      "Bedroom Photos",
      "Bathroom Photos",
      "Garden Photos",
    ],
    el: [
      "Εξωτερικές Φωτογραφίες",
      "Εσωτερικές Φωτογραφίες",
      "Φωτογραφίες Σαλονιού",
      "Φωτογραφίες Κουζίνας",
      "Φωτογραφίες Υπνοδωματίου",
      "Φωτογραφίες Μπάνιου",
      "Φωτογραφίες Κήπου",
    ],
  },
  FLOORPLAN: {
    en: [
      "Floor Plan",
      "Site Plan",
      "Architectural Drawing",
      "Building Layout",
    ],
    el: [
      "Κάτοψη",
      "Σχέδιο Οικοπέδου",
      "Αρχιτεκτονικό Σχέδιο",
      "Διάταξη Κτιρίου",
    ],
  },
  OTHER: {
    en: [
      "Additional Documents",
      "Supporting Documents",
      "Miscellaneous Files",
      "Notes and Remarks",
    ],
    el: [
      "Πρόσθετα Έγγραφα",
      "Συνοδευτικά Έγγραφα",
      "Διάφορα Αρχεία",
      "Σημειώσεις",
    ],
  },
};

const MIME_TYPES: Record<string, { mimeType: string; extension: string }[]> = {
  CONTRACT: [
    { mimeType: "application/pdf", extension: "pdf" },
    { mimeType: "application/msword", extension: "doc" },
    { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" },
  ],
  DEED: [
    { mimeType: "application/pdf", extension: "pdf" },
  ],
  CERTIFICATE: [
    { mimeType: "application/pdf", extension: "pdf" },
    { mimeType: "image/jpeg", extension: "jpg" },
  ],
  PHOTO: [
    { mimeType: "image/jpeg", extension: "jpg" },
    { mimeType: "image/png", extension: "png" },
    { mimeType: "image/webp", extension: "webp" },
  ],
  FLOORPLAN: [
    { mimeType: "application/pdf", extension: "pdf" },
    { mimeType: "image/png", extension: "png" },
    { mimeType: "image/jpeg", extension: "jpg" },
  ],
  OTHER: [
    { mimeType: "application/pdf", extension: "pdf" },
    { mimeType: "text/plain", extension: "txt" },
  ],
};

const DOCUMENT_TAGS = [
  "important",
  "verified",
  "pending-review",
  "archived",
  "draft",
  "signed",
  "notarized",
];

/**
 * Generate mock document data
 */
export function generateMockDocuments(
  count: number,
  locale: "en" | "el" = "en"
): MockDocument[] {
  const f = locale === "el" ? fakerEL : faker;
  const documents: MockDocument[] = [];

  for (let i = 0; i < count; i++) {
    const documentType = f.helpers.arrayElement(DOCUMENT_TYPES);
    const mimeInfo = f.helpers.arrayElement(MIME_TYPES[documentType]);
    const hasProperty = f.datatype.boolean(0.7);
    const hasClient = f.datatype.boolean(0.4);

    const createdAt = f.date.past({ years: 2 });

    documents.push({
      id: `demo_doc_${f.string.uuid()}`,
      name: f.helpers.arrayElement(DOCUMENT_NAMES[documentType][locale]),
      description: f.datatype.boolean(0.5)
        ? f.lorem.sentences({ min: 1, max: 2 })
        : null,
      documentType,
      mimeType: mimeInfo.mimeType,
      fileSize: f.number.int({ min: 10240, max: 10485760 }), // 10KB to 10MB
      fileUrl: `https://demo.oikion.gr/documents/${f.string.uuid()}.${mimeInfo.extension}`,
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
      uploadedBy: {
        id: `demo_user_${f.string.alphanumeric(8)}`,
        name: f.person.fullName(),
        email: f.internet.email().toLowerCase(),
      },
      tags: f.helpers.arrayElements(DOCUMENT_TAGS, f.number.int({ min: 0, max: 3 })),
      isPublic: f.datatype.boolean(0.2),
      createdAt: createdAt.toISOString(),
      updatedAt: f.date.between({ from: createdAt, to: new Date() }).toISOString(),
    });
  }

  return documents;
}
