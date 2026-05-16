import { prismadb } from "@/lib/prisma";
import type { Prisma, NotificationCategory, NotificationEntityType } from "@prisma/client";
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
// Prices tuned for matchmaking: R001 seeks €150k–280k apt, R002 seeks €400k–700k house
// ─────────────────────────────────────────────

const PROPERTY_SEED = [
  { neighbourhood: "Κολωνάκι", city: "Αθήνα", type: "APARTMENT" as const, price: 265000, sqm: 85, bedrooms: 2 },
  { neighbourhood: "Παγκράτι", city: "Αθήνα", type: "APARTMENT" as const, price: 195000, sqm: 68, bedrooms: 2 },
  { neighbourhood: "Γλυφάδα", city: "Γλυφάδα", type: "HOUSE" as const, price: 580000, sqm: 180, bedrooms: 4 },
  { neighbourhood: "Πασαλιμάνι", city: "Πειραιάς", type: "APARTMENT" as const, price: 165000, sqm: 55, bedrooms: 1 },
  { neighbourhood: "Κηφισιά", city: "Κηφισιά", type: "HOUSE" as const, price: 620000, sqm: 220, bedrooms: 5 },
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
    name_el: "Αναζήτηση διαμερίσματος Αθήνα",
    name_en: "Apartment search Athens",
    notes_el: "Ενδιαφέρεται για περιοχές κέντρου — Κολωνάκι, Παγκράτι, Εξάρχεια.",
    notes_en: "Interested in central areas — Kolonaki, Pagkrati, Exarcheia.",
    locationDisplayName_el: "Αθήνα — κέντρο",
    locationDisplayName_en: "Athens — city centre",
  },
  {
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["HOUSE" as const],
    budgetMin: 400000,
    budgetMax: 700000,
    surfaceMin: 150,
    bedroomsMin: 3,
    name_el: "Αναζήτηση μονοκατοικίας Βόρεια Προάστια",
    name_en: "House search Northern Suburbs",
    notes_el: "Προτιμά Κηφισιά, Μαρούσι, Χαλάνδρι. Απαραίτητος κήπος και χώρος στάθμευσης.",
    notes_en: "Prefers Kifissia, Maroussi, Chalandri. Garden and parking essential.",
    locationDisplayName_el: "Βόρεια Προάστια Αθήνας",
    locationDisplayName_en: "Northern Athens Suburbs",
  },
  {
    requestType: "RENT" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 600,
    budgetMax: 1000,
    surfaceMin: 50,
    bedroomsMin: 1,
    name_el: "Ενοικίαση διαμερίσματος κέντρο",
    name_en: "Apartment rental city centre",
    notes_el: "Χρειάζεται σύντομη εγκατάσταση — πιθανώς εντός μηνός.",
    notes_en: "Needs to move in quickly — possibly within the month.",
    locationDisplayName_el: "Κέντρο Αθήνας",
    locationDisplayName_en: "Athens city centre",
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
// Deal seed data — 3 deals at different pipeline stages
// ─────────────────────────────────────────────

interface DealSeed {
  stage: "INTEREST" | "NEGOTIATION" | "SIGNING";
  dealType: "SALE" | "RENT";
  agentRole: "DUAL_AGENCY" | "LISTING_SIDE" | "BUYER_SIDE";
  propIndex: number;
  reqIndex: number | null;
  title_el: string;
  title_en: string;
  agreedPrice?: number;
  commissionRate?: number;
}

const DEAL_SEED: DealSeed[] = [
  {
    stage: "NEGOTIATION",
    dealType: "SALE",
    agentRole: "DUAL_AGENCY",
    propIndex: 0,
    reqIndex: 0,
    title_el: "Πώληση Κολωνάκι",
    title_en: "Kolonaki Sale",
    agreedPrice: 260000,
    commissionRate: 2,
  },
  {
    stage: "SIGNING",
    dealType: "SALE",
    agentRole: "DUAL_AGENCY",
    propIndex: 2,
    reqIndex: 1,
    title_el: "Πώληση Γλυφάδα",
    title_en: "Glyfada House Sale",
    agreedPrice: 565000,
    commissionRate: 2,
  },
  {
    stage: "INTEREST",
    dealType: "SALE",
    agentRole: "LISTING_SIDE",
    propIndex: 1,
    reqIndex: null,
    title_el: "Ενδιαφέρον Παγκράτι",
    title_en: "Pagkrati Interest",
  },
];

// ─────────────────────────────────────────────
// Notification seed data
// ─────────────────────────────────────────────

interface NotificationSeed {
  type: NotificationCategory;
  title_el: string;
  title_en: string;
  message_el: string;
  message_en: string;
  entityType: NotificationEntityType;
  entityIndex: number | null;
  read: boolean;
  offsetHours: number;
}

const NOTIFICATION_SEED: NotificationSeed[] = [
  {
    type: "PROPERTY_CREATED",
    title_el: "Νέο ακίνητο προστέθηκε",
    title_en: "New property added",
    message_el: "Το ακίνητο DEMO-P001 (Κολωνάκι) προστέθηκε στο σύστημα.",
    message_en: "Property DEMO-P001 (Kolonaki) was added to the system.",
    entityType: "PROPERTY",
    entityIndex: 0,
    read: true,
    offsetHours: 48,
  },
  {
    type: "CONTACT_CREATED",
    title_el: "Νέα επαφή δημιουργήθηκε",
    title_en: "New contact created",
    message_el: "Νέα επαφή προστέθηκε από τη φόρμα επικοινωνίας.",
    message_en: "New contact added via the contact form.",
    entityType: "CONTACT",
    entityIndex: 0,
    read: true,
    offsetHours: 36,
  },
  {
    type: "DEAL_STAGE_CHANGED",
    title_el: "Ενημέρωση συμφωνίας",
    title_en: "Deal stage updated",
    message_el: "Η συμφωνία DEMO-D-002 προχώρησε στο στάδιο Υπογραφής.",
    message_en: "Deal DEMO-D-002 advanced to the Signing stage.",
    entityType: "DEAL",
    entityIndex: 1,
    read: true,
    offsetHours: 24,
  },
  {
    type: "REQUEST_ASSIGNED",
    title_el: "Αίτημα αγοράς ανατέθηκε",
    title_en: "Purchase request assigned",
    message_el: "Νέο αίτημα αγοράς (DEMO-R001) σας ανατέθηκε.",
    message_en: "New purchase request (DEMO-R001) has been assigned to you.",
    entityType: "REQUEST",
    entityIndex: 0,
    read: true,
    offsetHours: 20,
  },
  {
    type: "COMMENT_ADDED_PROPERTY",
    title_el: "Νέο σχόλιο σε ακίνητο",
    title_en: "New comment on property",
    message_el: "Νέο σχόλιο προστέθηκε στο ακίνητο DEMO-P003.",
    message_en: "A new comment was added to property DEMO-P003.",
    entityType: "PROPERTY",
    entityIndex: 2,
    read: true,
    offsetHours: 10,
  },
  {
    type: "SHOWING_SCHEDULED",
    title_el: "Νέο ραντεβού επίσκεψης",
    title_en: "Viewing appointment scheduled",
    message_el: "Επίσκεψη στο DEMO-P001 (Κολωνάκι) προγραμματίστηκε για αύριο στις 11:00.",
    message_en: "Viewing at DEMO-P001 (Kolonaki) scheduled for tomorrow at 11:00.",
    entityType: "PROPERTY",
    entityIndex: 0,
    read: false,
    offsetHours: 2,
  },
];

// ─────────────────────────────────────────────
// Calendar event seed data
// ─────────────────────────────────────────────

interface CalendarEventSeed {
  title_el: string;
  title_en: string;
  description_el: string;
  description_en: string;
  startOffsetDays: number;
  startHour: number;
  durationHours: number;
  location?: string;
  eventType: "PROPERTY_VIEWING" | "CLIENT_CONSULTATION" | "MEETING";
  propIndex?: number;
  contactIndex?: number;
}

const CALENDAR_EVENT_SEED: CalendarEventSeed[] = [
  {
    title_el: "Επίσκεψη Κολωνάκι — Παπαδόπουλος",
    title_en: "Kolonaki Viewing — Papadopoulos",
    description_el: "Επίσκεψη στο ακίνητο DEMO-P001 με τον πελάτη Παπαδόπουλο.",
    description_en: "Property viewing at DEMO-P001 with client Papadopoulos.",
    startOffsetDays: 1,
    startHour: 11,
    durationHours: 1,
    location: "Κολωνάκι, Αθήνα",
    eventType: "PROPERTY_VIEWING",
    propIndex: 0,
    contactIndex: 0,
  },
  {
    title_el: "Συνάντηση πελάτη — Δημητρίου",
    title_en: "Client meeting — Dimitriou",
    description_el: "Συνάντηση με νέο πελάτη για παρουσίαση αιτήματος αγοράς.",
    description_en: "Meeting with new client to present purchase request options.",
    startOffsetDays: 3,
    startHour: 10,
    durationHours: 1,
    eventType: "CLIENT_CONSULTATION",
    contactIndex: 3,
  },
  {
    title_el: "Αποτίμηση ακινήτου Μαρούσι",
    title_en: "Property appraisal Maroussi",
    description_el: "Αυτοψία και εκτίμηση αξίας ακινήτου DEMO-P006.",
    description_en: "On-site inspection and valuation of property DEMO-P006.",
    startOffsetDays: 5,
    startHour: 14,
    durationHours: 2,
    location: "Μαρούσι, Αττική",
    eventType: "PROPERTY_VIEWING",
    propIndex: 5,
  },
];

// ─────────────────────────────────────────────
// Task seed data
// ─────────────────────────────────────────────

interface TaskSeed {
  title_el: string;
  title_en: string;
  content_el: string;
  content_en: string;
  priority: string;
  dueDays: number;
}

const TASK_SEED: TaskSeed[] = [
  {
    title_el: "Αποστολή πιστοποιητικού ενέργειας",
    title_en: "Send energy certificate",
    content_el: "Αποστολή ενεργειακού πιστοποιητικού (Β+) στον αγοραστή για το DEMO-P001.",
    content_en: "Send the B+ energy certificate to the buyer for DEMO-P001.",
    priority: "HIGH",
    dueDays: 2,
  },
  {
    title_el: "Επικοινωνία με συμβολαιογράφο",
    title_en: "Contact the notary",
    content_el: "Επικοινωνία με συμβολαιογράφο για τον προγραμματισμό υπογραφής DEMO-D-002.",
    content_en: "Contact the notary to schedule signing for DEMO-D-002.",
    priority: "MEDIUM",
    dueDays: 5,
  },
  {
    title_el: "Ανανέωση φωτογραφιών DEMO-P003",
    title_en: "Update photos for DEMO-P003",
    content_el: "Οργάνωση νέας φωτογράφησης για το ακίνητο στη Γλυφάδα.",
    content_en: "Arrange a new photo shoot for the Glyfada property.",
    priority: "LOW",
    dueDays: 10,
  },
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

/**
 * Generate a deterministic negative integer for demo CalendarEvent.calendarEventId.
 * Cal.com IDs are positive integers, so negatives are safe and won't conflict.
 * Uses the full 30-bit hash value: -(hash * 3 + index + 1). This spreads
 * orgs across ~3 billion slots. Birthday-paradox collision risk becomes
 * non-trivial only at ~60,000+ concurrent demo orgs; acceptable for current scale.
 * If platform reaches that scale, replace with a per-org sequential counter.
 */
function demoCalendarEventId(orgId: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < orgId.length; i++) {
    hash = (hash * 31 + orgId.charCodeAt(i)) & 0x3fff_ffff; // 30-bit to keep room for * 3
  }
  return -(hash * 3 + index + 1);
}

// ─────────────────────────────────────────────
// seedDemoOrgExtras — adds deals, notifications, events, tasks
// Safe to call on both new and existing demo orgs (idempotent via skipDuplicates).
// ─────────────────────────────────────────────

export async function seedDemoOrgExtras(
  orgId: string,
  userId: string,
  locale: "el" | "en"
): Promise<void> {
  const isEl = locale === "el";
  const now = new Date();

  // ── Deals ────────────────────────────────────────────────────────────────────
  await prismadb.deal.createMany({
    data: DEAL_SEED.map((d, i) => ({
      id: `demo_deal_${orgId}_${i}`,
      friendlyId: `DEMO-D-${String(i + 1).padStart(3, "0")}`,
      organizationId: orgId,
      propertyId: `demo_prop_${orgId}_${d.propIndex}`,
      requestId: d.reqIndex !== null ? `demo_req_${orgId}_${d.reqIndex}` : null,
      stage: d.stage,
      dealType: d.dealType,
      agentRole: d.agentRole,
      status: "PROPOSED",
      title: isEl ? d.title_el : d.title_en,
      agreedPrice: d.agreedPrice ?? null,
      commissionRate: d.commissionRate ?? null,
      listingAgentId: userId,
      buyerAgentId: userId,
      proposedById: userId,
      createdAt: new Date(now.getTime() - (DEAL_SEED.length - i) * 86_400_000),
    })),
    skipDuplicates: true,
  });

  // ── DealParty — link contacts to deals ──────────────────────────────────────
  await prismadb.dealParty.createMany({
    data: [
      // Deal 0 (Negotiation): buyer + seller
      {
        id: `demo_dpty_${orgId}_0`,
        organizationId: orgId,
        dealId: `demo_deal_${orgId}_0`,
        contactId: `demo_contact_${orgId}_0`,
        role: "BUYER",
      },
      {
        id: `demo_dpty_${orgId}_1`,
        organizationId: orgId,
        dealId: `demo_deal_${orgId}_0`,
        contactId: `demo_contact_${orgId}_1`,
        role: "SELLER",
      },
      // Deal 1 (Signing): buyer
      {
        id: `demo_dpty_${orgId}_2`,
        organizationId: orgId,
        dealId: `demo_deal_${orgId}_1`,
        contactId: `demo_contact_${orgId}_2`,
        role: "BUYER",
      },
      // Deal 2 (Interest): buyer
      {
        id: `demo_dpty_${orgId}_3`,
        organizationId: orgId,
        dealId: `demo_deal_${orgId}_2`,
        contactId: `demo_contact_${orgId}_3`,
        role: "BUYER",
      },
    ],
    skipDuplicates: true,
  });

  // ── Notifications ─────────────────────────────────────────────────────────────
  await prismadb.notification.createMany({
    data: NOTIFICATION_SEED.map((n, i) => {
      const entityId =
        n.entityType === "PROPERTY" && n.entityIndex !== null
          ? `demo_prop_${orgId}_${n.entityIndex}`
          : n.entityType === "CONTACT" && n.entityIndex !== null
          ? `demo_contact_${orgId}_${n.entityIndex}`
          : n.entityType === "DEAL" && n.entityIndex !== null
          ? `demo_deal_${orgId}_${n.entityIndex}`
          : n.entityType === "REQUEST" && n.entityIndex !== null
          ? `demo_req_${orgId}_${n.entityIndex}`
          : null;

      const createdAt = new Date(now.getTime() - n.offsetHours * 3_600_000);
      return {
        id: `demo_notif_${orgId}_${i}`,
        userId,
        organizationId: orgId,
        type: n.type,
        title: isEl ? n.title_el : n.title_en,
        message: isEl ? n.message_el : n.message_en,
        entityType: n.entityType,
        entityId,
        read: n.read,
        readAt: n.read ? createdAt : null,
        actorId: userId,
        actorName: null,
        metadata: {},
        createdAt,
        updatedAt: createdAt,
      };
    }),
    skipDuplicates: true,
  });

  // ── Calendar events ──────────────────────────────────────────────────────────
  const calEventIds: string[] = [];
  for (let i = 0; i < CALENDAR_EVENT_SEED.length; i++) {
    const ev = CALENDAR_EVENT_SEED[i];
    const calEventId = `demo_calevent_${orgId}_${i}`;
    calEventIds.push(calEventId);

    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + ev.startOffsetDays);
    startTime.setHours(ev.startHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + ev.durationHours * 3_600_000);

    // Use upsert to be idempotent — calendarEventId must be globally unique
    await prismadb.calendarEvent.upsert({
      where: { id: calEventId },
      create: {
        id: calEventId,
        friendlyId: `DEMO-E${String(i + 1).padStart(3, "0")}`,
        organizationId: orgId,
        calendarEventId: demoCalendarEventId(orgId, i),
        calendarUserId: 0,
        title: isEl ? ev.title_el : ev.title_en,
        description: isEl ? ev.description_el : ev.description_en,
        startTime,
        endTime,
        location: ev.location ?? null,
        eventType: ev.eventType,
        assignedUserId: userId,
        status: "confirmed",
        documentIds: [],
        reminderMinutes: [60],
        updatedAt: now,
      },
      // Refresh times so events are always in the near future after a reseed.
      update: { startTime, endTime, updatedAt: now },
    });

    // Link to property if specified
    if (ev.propIndex !== undefined) {
      await prismadb.calendarEvent.update({
        where: { id: calEventId },
        data: {
          Properties: {
            connect: { id: `demo_prop_${orgId}_${ev.propIndex}` },
          },
        },
      });
    }

    // Link to contact if specified
    if (ev.contactIndex !== undefined) {
      await prismadb.calendarEvent.update({
        where: { id: calEventId },
        data: {
          Contacts: {
            connect: { id: `demo_contact_${orgId}_${ev.contactIndex}` },
          },
        },
      });
    }
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────
  await prismadb.crm_Accounts_Tasks.createMany({
    data: TASK_SEED.map((t, i) => ({
      id: `demo_task_${orgId}_${i}`,
      friendlyId: `DEMO-T${String(i + 1).padStart(3, "0")}`,
      organizationId: orgId,
      title: isEl ? t.title_el : t.title_en,
      content: isEl ? t.content_el : t.content_en,
      priority: t.priority,
      dueDateAt: new Date(now.getTime() + t.dueDays * 86_400_000),
      user: userId,
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86_400_000),
      updatedAt: now,
    })),
    skipDuplicates: true,
  });
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
    const property_name =
      isEl
        ? `${p.type === "APARTMENT" ? "Διαμέρισμα" : "Μονοκατοικία"} ${p.neighbourhood}`
        : `${p.type === "APARTMENT" ? "Apartment" : "House"} ${p.neighbourhood}`;
    return {
      id: `demo_prop_${orgId}_${i}`,
      organizationId: orgId,
      property_name,
      price: p.price,
      size_net_sqm: p.sqm,
      bedrooms: p.bedrooms,
      property_type: p.type,
      property_status: "ACTIVE" as const,
      address_city: p.city,
      area: p.neighbourhood,
      createdBy: userId,
      friendlyId: `DEMO-P${String(i + 1).padStart(3, "0")}`,
    };
  });

  // encryptPropertyForOrg is a no-op here — seed data has no primary_email or
  // communication_notes. The cast silences the constraint mismatch.
  const encryptedProperties = (await Promise.all(
    propertiesRaw.map((p) => encryptPropertyForOrg(p as never, orgId))
  )) as unknown as typeof propertiesRaw;

  // ── Encrypt all requests BEFORE transaction ───────────────────────────────
  const requestsRaw = REQUEST_SEED.map((r, i) => ({
    id: `demo_req_${orgId}_${i}`,
    organizationId: orgId,
    name: isEl ? r.name_el : r.name_en,
    notes: isEl ? r.notes_el : r.notes_en,
    locationDisplayName: isEl ? r.locationDisplayName_el : r.locationDisplayName_en,
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
      data: encryptedProperties as unknown as Prisma.PropertiesCreateManyInput[],
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

  // ── Extras (outside transaction — some use upsert which is incompatible) ────
  await seedDemoOrgExtras(orgId, userId, locale);
}
