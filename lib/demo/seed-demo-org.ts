import { prismadb } from "@/lib/prisma";
import {
  encryptContactForOrg,
  encryptPropertyForOrg,
  encryptRequestForOrg,
} from "@/lib/model-encryption";

// ─────────────────────────────────────────────
// Agency name pool
// ─────────────────────────────────────────────

const DEMO_AGENCY_NAMES = [
  "Αθηναϊκή Κτηματομεσιτική",
  "Aegean Properties",
  "Αττική Real Estate",
  "Μεσογειακή Ακίνητα",
  "Ελληνική Κτηματαγορά",
  "Πειραϊκή Μεσιτική",
];

export function pickDemoAgencyName(): string {
  return DEMO_AGENCY_NAMES[Math.floor(Math.random() * DEMO_AGENCY_NAMES.length)];
}

// ─────────────────────────────────────────────
// Contact name pools
// ─────────────────────────────────────────────

const CONTACT_POOL_EL = [
  { firstName: "Νίκος", lastName: "Παπαδόπουλος" },
  { firstName: "Ελένη", lastName: "Κωνσταντίνου" },
  { firstName: "Γιώργος", lastName: "Αλεξίου" },
  { firstName: "Μαρία", lastName: "Δημητρίου" },
  { firstName: "Κώστας", lastName: "Παπαγεωργίου" },
  { firstName: "Άννα", lastName: "Νικολάου" },
  { firstName: "Δημήτρης", lastName: "Χριστοδούλου" },
  { firstName: "Σοφία", lastName: "Αντωνίου" },
  { firstName: "Πέτρος", lastName: "Γεωργίου" },
  { firstName: "Ευαγγελία", lastName: "Μακρή" },
  { firstName: "Σταύρος", lastName: "Παπανικολάου" },
  { firstName: "Χριστίνα", lastName: "Κουτσούκη" },
];

const CONTACT_POOL_EN = [
  { firstName: "Alex", lastName: "Papadopoulos" },
  { firstName: "Elena", lastName: "Konstantinou" },
  { firstName: "George", lastName: "Alexiou" },
  { firstName: "Maria", lastName: "Dimitriou" },
  { firstName: "Kostas", lastName: "Papageorgiou" },
  { firstName: "Anna", lastName: "Nikolaou" },
  { firstName: "Dimitris", lastName: "Christodoulou" },
  { firstName: "Sofia", lastName: "Antoniou" },
  { firstName: "Petros", lastName: "Georgiou" },
  { firstName: "Eva", lastName: "Makri" },
  { firstName: "Stavros", lastName: "Papanikolaou" },
  { firstName: "Christina", lastName: "Koutsouki" },
];

// ─────────────────────────────────────────────
// Property seed data
// ─────────────────────────────────────────────

const PROPERTY_SEED = [
  { neighbourhood: "Κολωνάκι", city: "Αθήνα", type: "APARTMENT" as const, price: 320000, sqm: 85, bedrooms: 2 },
  { neighbourhood: "Παγκράτι", city: "Αθήνα", type: "APARTMENT" as const, price: 195000, sqm: 68, bedrooms: 2 },
  { neighbourhood: "Γλυφάδα", city: "Γλυφάδα", type: "HOUSE" as const, price: 580000, sqm: 180, bedrooms: 4 },
  { neighbourhood: "Πασαλιμάνι", city: "Πειραιάς", type: "APARTMENT" as const, price: 145000, sqm: 55, bedrooms: 1 },
  { neighbourhood: "Κηφισιά", city: "Κηφισιά", type: "HOUSE" as const, price: 750000, sqm: 220, bedrooms: 5 },
  { neighbourhood: "Μαρούσι", city: "Μαρούσι", type: "APARTMENT" as const, price: 230000, sqm: 90, bedrooms: 3 },
  { neighbourhood: "Κέντρο", city: "Θεσσαλονίκη", type: "APARTMENT" as const, price: 180000, sqm: 75, bedrooms: 2 },
];

// ─────────────────────────────────────────────
// Request seed data
// ─────────────────────────────────────────────

const REQUEST_SEED = [
  {
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 150000,
    budgetMax: 280000,
    surfaceMin: 60,
    bedroomsMin: 2,
    title_el: "Αναζήτηση διαμερίσματος Αθήνα",
    title_en: "Apartment search Athens",
  },
  {
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["HOUSE" as const],
    budgetMin: 400000,
    budgetMax: 700000,
    surfaceMin: 150,
    bedroomsMin: 3,
    title_el: "Αναζήτηση μονοκατοικίας Βόρεια Προάστια",
    title_en: "House search Northern Suburbs",
  },
  {
    requestType: "RENT" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 600,
    budgetMax: 1000,
    surfaceMin: 50,
    bedroomsMin: 1,
    title_el: "Ενοικίαση διαμερίσματος κέντρο",
    title_en: "Apartment rental city centre",
  },
];

// ─────────────────────────────────────────────
// Message content pools
// ─────────────────────────────────────────────

const MESSAGE_CONTENT_EL = [
  "Ο πελάτης Παπαδόπουλος θέλει να δει το ακίνητο στο Κολωνάκι αύριο στις 11:00.",
  "Ανανέωσα τα στοιχεία επικοινωνίας για τον Αλεξίου.",
  "Νέα αίτηση από portal — αναθέστε σε διαθέσιμο μεσίτη.",
  "Η σύμβαση για το ακίνητο DEMO-P002 υπογράφηκε.",
  "Θυμίζω: ανανέωση άδειας ακινήτου DEMO-P005 στις 30/6.",
  "Ο Γεωργίου επιβεβαίωσε το ραντεβού για Παρασκευή.",
  "Εισαγωγή 12 νέων επαφών από την έκθεση ολοκληρώθηκε.",
  "Το ακίνητο DEMO-P003 ανέβηκε στο portal.",
  "Νέα αντιστοίχιση: DEMO-R001 ←→ DEMO-P001 (σκορ 87%)",
  "Ο πελάτης Κωνσταντίνου ζητά βεβαίωση για το DEMO-P007.",
];

const MESSAGE_CONTENT_EN = [
  "Client Papadopoulos wants to view the Kolonaki property tomorrow at 11:00.",
  "Updated contact details for Alexiou.",
  "New lead from portal — assign to available agent.",
  "Contract for property DEMO-P002 signed.",
  "Reminder: licence renewal for property DEMO-P005 on 30/6.",
  "Georgiou confirmed the Friday appointment.",
  "Import of 12 contacts from the exhibition completed.",
  "Property DEMO-P003 listed on portal.",
  "New match: DEMO-R001 ←→ DEMO-P001 (score 87%)",
  "Client Konstantinou requests utility certificate for DEMO-P007.",
];

// ─────────────────────────────────────────────
// Comment content pools
// ─────────────────────────────────────────────

const PROPERTY_COMMENT_EL = [
  "Ελέγχθηκε — όλα εντάξει.",
  "Χρειάζεται ανανέωση πριν την πώληση.",
  "Η ενεργειακή κλάση είναι Β+.",
];

const PROPERTY_COMMENT_EN = [
  "Checked — all in order.",
  "Needs renewal before sale.",
  "Energy class is B+.",
];

const CONTACT_COMMENT_EL = [
  "Επικοινωνία εγκρίθηκε από πελάτη.",
  "Ζητά ενημέρωση για νέα ακίνητα.",
  "Ενδιαφέρεται για συνεργασία.",
];

const CONTACT_COMMENT_EN = [
  "Contact consent confirmed.",
  "Requesting updates on new listings.",
  "Interested in partnership.",
];

// ─────────────────────────────────────────────
// Utility: shuffle and pick n from array
// ─────────────────────────────────────────────

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ─────────────────────────────────────────────
// Main seeder
// ─────────────────────────────────────────────

export async function seedDemoOrg(
  orgId: string,
  userId: string,
  locale: "el" | "en"
): Promise<void> {
  if (!orgId) {
    throw new Error("[seed-demo-org] seedDemoOrg: orgId is required");
  }
  if (!userId) throw new Error("[seed-demo-org] seedDemoOrg: userId is required");

  const isEl = locale === "el";
  const contactPool = isEl ? CONTACT_POOL_EL : CONTACT_POOL_EN;
  const selectedContacts = pickN(contactPool, 8);
  const messageContents = isEl ? MESSAGE_CONTENT_EL : MESSAGE_CONTENT_EN;
  const propertyCommentTexts = isEl ? PROPERTY_COMMENT_EL : PROPERTY_COMMENT_EN;
  const contactCommentTexts = isEl ? CONTACT_COMMENT_EL : CONTACT_COMMENT_EN;

  // ── Encrypt all contacts BEFORE transaction ──────────────────────────────
  const contactCategories: Array<["BUYER"] | ["SELLER"] | ["INVESTOR"]> = [
    ["BUYER"],
    ["SELLER"],
    ["INVESTOR"],
  ];

  const contactsRaw = selectedContacts.map((person, i) => ({
    id: `demo_contact_${orgId}_${i}`,
    organizationId: orgId,
    displayName: `${person.firstName} ${person.lastName}`,
    firstName: person.firstName,
    lastName: person.lastName,
    email: `demo.contact${i}@example.com`,
    category: contactCategories[i % 3],
    status: "ACTIVE" as const,
    createdBy: userId,
    gdprConsentGiven: true,
    gdprConsentDate: new Date(),
  }));

  const encryptedContacts = await Promise.all(
    contactsRaw.map((c) => encryptContactForOrg(c, orgId))
  );

  // ── Encrypt all properties BEFORE transaction ─────────────────────────────
  const propertiesRaw = PROPERTY_SEED.map((p, i) => {
    const title =
      isEl
        ? `${p.type === "APARTMENT" ? "Διαμέρισμα" : "Μονοκατοικία"} ${p.neighbourhood}`
        : `${p.type === "APARTMENT" ? "Apartment" : "House"} ${p.neighbourhood}`;
    return {
      id: `demo_prop_${orgId}_${i}`,
      organizationId: orgId,
      title,
      price: p.price,
      size_net_sqm: p.sqm,
      bedrooms: p.bedrooms,
      property_type: p.type,
      status: "ACTIVE" as const,
      purpose: "RESIDENTIAL" as const,
      address_city: p.city,
      address_area: p.neighbourhood,
      address_country: "Greece",
      createdBy: userId,
      friendlyId: `DEMO-P${String(i + 1).padStart(3, "0")}`,
    };
  });

  const encryptedProperties = await Promise.all(
    propertiesRaw.map((p) => encryptPropertyForOrg(p, orgId))
  );

  // ── Encrypt all requests BEFORE transaction ───────────────────────────────
  const requestsRaw = REQUEST_SEED.map((r, i) => ({
    id: `demo_req_${orgId}_${i}`,
    organizationId: orgId,
    title: isEl ? r.title_el : r.title_en,
    requestType: r.requestType,
    propertyCategory: r.propertyCategory,
    propertyTypes: r.propertyTypes,
    budgetMin: r.budgetMin,
    budgetMax: r.budgetMax,
    surfaceMin: r.surfaceMin,
    bedroomsMin: r.bedroomsMin,
    status: "ACTIVE" as const,
    createdBy: userId,
    friendlyId: `DEMO-R${String(i + 1).padStart(3, "0")}`,
  }));

  const encryptedRequests = await Promise.all(
    requestsRaw.map((r) => encryptRequestForOrg(r, orgId))
  );

  // ── Transaction ───────────────────────────────────────────────────────────
  await prismadb.$transaction(async (tx) => {
    const db = tx as unknown as typeof prismadb;

    // 1. OrganizationSettings — mark as demo
    await db.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, isDemo: true, createdBy: userId },
      update: { isDemo: true },
    });

    // 2. General channel
    const channel = await db.channel.create({
      data: {
        organizationId: orgId,
        name: isEl ? "Γενικά" : "General",
        slug: "general",
        isDefault: true,
        isE2ee: false,
        createdById: userId,
      },
    });

    // 3. Channel member
    await db.channelMember.create({
      data: {
        channelId: channel.id,
        userId,
      },
    });

    // 4. Contacts
    await db.contact.createMany({
      data: encryptedContacts,
    });

    // 5. Properties
    await db.properties.createMany({
      data: encryptedProperties,
    });

    // 6. Requests
    await db.request.createMany({
      data: encryptedRequests,
    });

    // 7. Messages
    await db.message.createMany({
      data: messageContents.map((content, i) => ({
        organizationId: orgId,
        channelId: channel.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(Date.now() - (messageContents.length - i) * 3_600_000),
      })),
    });

    // 8. Documents
    await db.documents.createMany({
      data: [
        {
          id: `demo_doc_${orgId}_0`,
          friendlyId: "DEMO-D001",
          organizationId: orgId,
          document_name: isEl ? "Πιστοποιητικό Ενέργειας" : "Energy Certificate",
          document_system_type: "OTHER" as const,
          document_file_mimeType: "application/pdf",
          document_file_url: "https://example.com/demo-placeholder.pdf",
          created_by_user: userId,
          createdBy: userId,
          linkedPropertiesIds: [`demo_prop_${orgId}_0`],
          contactsIDs: [],
        },
        {
          id: `demo_doc_${orgId}_1`,
          friendlyId: "DEMO-D002",
          organizationId: orgId,
          document_name: isEl ? "Κάτοψη Ακινήτου" : "Floor Plan",
          document_system_type: "OTHER" as const,
          document_file_mimeType: "application/pdf",
          document_file_url: "https://example.com/demo-placeholder.pdf",
          created_by_user: userId,
          createdBy: userId,
          linkedPropertiesIds: [`demo_prop_${orgId}_1`],
          contactsIDs: [],
        },
        {
          id: `demo_doc_${orgId}_2`,
          friendlyId: "DEMO-D003",
          organizationId: orgId,
          document_name: isEl ? "Συμφωνητικό Εντολής" : "Client Agreement",
          document_system_type: "CONTRACT" as const,
          document_file_mimeType: "application/pdf",
          document_file_url: "https://example.com/demo-placeholder.pdf",
          created_by_user: userId,
          createdBy: userId,
          linkedPropertiesIds: [],
          contactsIDs: [],
        },
        {
          id: `demo_doc_${orgId}_3`,
          friendlyId: "DEMO-D004",
          organizationId: orgId,
          document_name: isEl ? "Ταυτότητα Πελάτη" : "Client ID Copy",
          document_system_type: "OTHER" as const,
          document_file_mimeType: "application/pdf",
          document_file_url: "https://example.com/demo-placeholder.pdf",
          created_by_user: userId,
          createdBy: userId,
          linkedPropertiesIds: [],
          contactsIDs: [],
        },
      ],
    });

    // 9. Property comments
    await db.propertyComment.createMany({
      data: propertyCommentTexts.map((content, i) => ({
        id: `demo_pcomment_${orgId}_${i}`,
        propertyId: `demo_prop_${orgId}_${i}`,
        userId,
        content,
        updatedAt: new Date(),
      })),
    });

    // 10. Contact comments
    await db.contactComment.createMany({
      data: contactCommentTexts.map((content, i) => ({
        contactId: `demo_contact_${orgId}_${i}`,
        userId,
        content,
      })),
    });
  });
}
