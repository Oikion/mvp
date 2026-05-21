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
// Contact name pools — 25 names, pick 20
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
  { firstName: "Αλέξης", lastName: "Παπαθανασίου" },
  { firstName: "Ζωή", lastName: "Αναστασίου" },
  { firstName: "Μιχάλης", lastName: "Οικονόμου" },
  { firstName: "Κατερίνα", lastName: "Βασιλείου" },
  { firstName: "Ιωάννης", lastName: "Σταματίου" },
  { firstName: "Δήμητρα", lastName: "Παπαδάκη" },
  { firstName: "Άγγελος", lastName: "Θεοδώρου" },
  { firstName: "Μαρίνα", lastName: "Λεωνίδου" },
  { firstName: "Χρήστος", lastName: "Αθανασίου" },
  { firstName: "Ελεάνα", lastName: "Σπυροπούλου" },
  { firstName: "Κυριάκος", lastName: "Παπακωνσταντίνου" },
  { firstName: "Νεκτάρια", lastName: "Φωτίου" },
  { firstName: "Βασίλης", lastName: "Μαρκόπουλος" },
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
  { firstName: "Alex", lastName: "Papathanasiou" },
  { firstName: "Zoe", lastName: "Anastasiou" },
  { firstName: "Michalis", lastName: "Oikonomou" },
  { firstName: "Katerina", lastName: "Vasiliou" },
  { firstName: "Yannis", lastName: "Stamatious" },
  { firstName: "Dimitra", lastName: "Papadaki" },
  { firstName: "Angelos", lastName: "Theodorou" },
  { firstName: "Marina", lastName: "Leonidou" },
  { firstName: "Christos", lastName: "Athanassiou" },
  { firstName: "Eleana", lastName: "Spyropoulou" },
  { firstName: "Kyriakos", lastName: "Papakonstantinou" },
  { firstName: "Nektaria", lastName: "Fotiou" },
  { firstName: "Vassilis", lastName: "Markopoulos" },
];

// ─────────────────────────────────────────────
// Property seed data — 18 properties
// Prices tuned so R001–R006 produce ≥2 matches each.
// ─────────────────────────────────────────────

const PROPERTY_SEED = [
  // index 0 — matches R001 (Athens apts €150k-280k) and R006 (large apts €220k-320k)
  { neighbourhood: "Κολωνάκι",        city: "Αθήνα",       type: "APARTMENT" as const, price: 265000, sqm: 85,  bedrooms: 2 },
  // index 1 — matches R001
  { neighbourhood: "Παγκράτι",        city: "Αθήνα",       type: "APARTMENT" as const, price: 195000, sqm: 68,  bedrooms: 2 },
  // index 2 — matches R002 (Northern suburbs houses €400k-700k)
  { neighbourhood: "Γλυφάδα",         city: "Γλυφάδα",     type: "HOUSE"     as const, price: 580000, sqm: 180, bedrooms: 4 },
  // index 3 — matches R001
  { neighbourhood: "Πασαλιμάνι",      city: "Πειραιάς",    type: "APARTMENT" as const, price: 165000, sqm: 55,  bedrooms: 1 },
  // index 4 — matches R002 and R005 (luxury houses €680k-900k)
  { neighbourhood: "Κηφισιά",         city: "Κηφισιά",     type: "HOUSE"     as const, price: 690000, sqm: 220, bedrooms: 5 },
  // index 5 — matches R006 (large apts €220k-320k, 85sqm+, 3bed)
  { neighbourhood: "Μαρούσι",         city: "Μαρούσι",     type: "APARTMENT" as const, price: 235000, sqm: 92,  bedrooms: 3 },
  // index 6 — matches R001 and R003 (affordable apts €120k-180k)
  { neighbourhood: "Κέντρο",          city: "Θεσσαλονίκη", type: "APARTMENT" as const, price: 175000, sqm: 75,  bedrooms: 2 },
  // index 7 — matches R002
  { neighbourhood: "Βούλα",           city: "Βούλα",       type: "HOUSE"     as const, price: 490000, sqm: 160, bedrooms: 3 },
  // index 8 — matches R004 (Southern suburbs apts €200k-320k)
  { neighbourhood: "Νέα Σμύρνη",      city: "Νέα Σμύρνη",  type: "APARTMENT" as const, price: 215000, sqm: 74,  bedrooms: 2 },
  // index 9 — matches R006
  { neighbourhood: "Χαλάνδρι",        city: "Χαλάνδρι",    type: "APARTMENT" as const, price: 285000, sqm: 97,  bedrooms: 3 },
  // index 10 — matches R005 (luxury houses €680k-900k, 200sqm+, 4bed)
  { neighbourhood: "Ψυχικό",          city: "Ψυχικό",      type: "HOUSE"     as const, price: 760000, sqm: 245, bedrooms: 4 },
  // index 11 — matches R001 and R003
  { neighbourhood: "Εξάρχεια",        city: "Αθήνα",       type: "APARTMENT" as const, price: 172000, sqm: 61,  bedrooms: 2 },
  // index 12 — matches R003 (affordable apts €120k-180k)
  { neighbourhood: "Γαλάτσι",         city: "Αθήνα",       type: "APARTMENT" as const, price: 142000, sqm: 58,  bedrooms: 2 },
  // index 13 — matches R006
  { neighbourhood: "Αγ. Παρασκευή",   city: "Αγ. Παρασκευή", type: "APARTMENT" as const, price: 295000, sqm: 100, bedrooms: 3 },
  // index 14 — matches R004
  { neighbourhood: "Πλάκα",           city: "Αθήνα",       type: "APARTMENT" as const, price: 318000, sqm: 78,  bedrooms: 2 },
  // index 15 — matches R003
  { neighbourhood: "Ζωγράφου",        city: "Αθήνα",       type: "APARTMENT" as const, price: 155000, sqm: 62,  bedrooms: 2 },
  // index 16 — matches R002
  { neighbourhood: "Μελίσσια",        city: "Μελίσσια",    type: "HOUSE"     as const, price: 452000, sqm: 155, bedrooms: 3 },
  // index 17 — matches R004
  { neighbourhood: "Βάρη",            city: "Βάρη",        type: "HOUSE"     as const, price: 388000, sqm: 132, bedrooms: 3 },
];

// ─────────────────────────────────────────────
// Request seed data — 6 requests
// Each request matches ≥2 properties in PROPERTY_SEED.
// ─────────────────────────────────────────────

const REQUEST_SEED = [
  {
    // R001 → matches P000 Κολωνάκι €265k, P001 Παγκράτι €195k, P003 Πασαλιμάνι €165k, P006 Θεσσαλονίκη €175k, P011 Εξάρχεια €172k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 150000,
    budgetMax: 280000,
    surfaceMin: 55,
    bedroomsMin: 1,
    name_el: "Αναζήτηση διαμερίσματος Αθήνα κέντρο",
    name_en: "Apartment search Athens centre",
    notes_el: "Κεντρικές περιοχές — Κολωνάκι, Παγκράτι, Εξάρχεια, Πειραιάς.",
    notes_en: "Central areas — Kolonaki, Pagkrati, Exarcheia, Piraeus.",
    locationDisplayName_el: "Κεντρική Αθήνα",
    locationDisplayName_en: "Central Athens",
  },
  {
    // R002 → matches P002 Γλυφάδα €580k, P004 Κηφισιά €690k, P007 Βούλα €490k, P016 Μελίσσια €452k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["HOUSE" as const],
    budgetMin: 400000,
    budgetMax: 720000,
    surfaceMin: 150,
    bedroomsMin: 3,
    name_el: "Αναζήτηση μονοκατοικίας Βόρεια Προάστια",
    name_en: "House search Northern Suburbs",
    notes_el: "Κηφισιά, Μαρούσι, Χαλάνδρι. Απαραίτητος κήπος και χώρος στάθμευσης.",
    notes_en: "Kifissia, Maroussi, Chalandri. Garden and parking essential.",
    locationDisplayName_el: "Βόρεια Προάστια Αθήνας",
    locationDisplayName_en: "Northern Athens Suburbs",
  },
  {
    // R003 → matches P006 Θεσσαλονίκη €175k, P011 Εξάρχεια €172k, P012 Γαλάτσι €142k, P015 Ζωγράφου €155k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 120000,
    budgetMax: 185000,
    surfaceMin: 50,
    bedroomsMin: 2,
    name_el: "Εισοδηματική επένδυση — προσιτό διαμέρισμα",
    name_en: "Income investment — affordable apartment",
    notes_el: "Δυτικές/κεντρικές περιοχές Αθήνας, Θεσσαλονίκη.",
    notes_en: "Western/central Athens areas, Thessaloniki.",
    locationDisplayName_el: "Αθήνα — δυτικές περιοχές",
    locationDisplayName_en: "Athens — western areas",
  },
  {
    // R004 → matches P008 Νέα Σμύρνη €215k, P014 Πλάκα €318k, P017 Βάρη €388k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const, "HOUSE" as const],
    budgetMin: 200000,
    budgetMax: 400000,
    surfaceMin: 70,
    bedroomsMin: 2,
    name_el: "Διαμέρισμα ή μικρή μονοκατοικία νότια προάστια",
    name_en: "Apartment or small house southern suburbs",
    notes_el: "Νέα Σμύρνη, Βάρη, Βούλα — κοντά σε σχολεία.",
    notes_en: "Nea Smyrni, Vari, Voula — near schools.",
    locationDisplayName_el: "Νότια Προάστια",
    locationDisplayName_en: "Southern Suburbs",
  },
  {
    // R005 → matches P004 Κηφισιά €690k, P010 Ψυχικό €760k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["HOUSE" as const],
    budgetMin: 650000,
    budgetMax: 900000,
    surfaceMin: 200,
    bedroomsMin: 4,
    name_el: "Πολυτελής κατοικία Ψυχικό — Εκάλη",
    name_en: "Luxury house Psychiko — Ekali",
    notes_el: "Μεγάλος κήπος, χώρος στάθμευσης, υψηλή ποιότητα κατασκευής.",
    notes_en: "Large garden, parking, high-quality construction.",
    locationDisplayName_el: "Ψυχικό / Εκάλη",
    locationDisplayName_en: "Psychiko / Ekali",
  },
  {
    // R006 → matches P000 Κολωνάκι €265k, P005 Μαρούσι €235k, P009 Χαλάνδρι €285k, P013 Αγ. Παρασκευή €295k
    requestType: "BUY" as const,
    propertyCategory: "RESIDENTIAL" as const,
    propertyTypes: ["APARTMENT" as const],
    budgetMin: 220000,
    budgetMax: 320000,
    surfaceMin: 85,
    bedroomsMin: 3,
    name_el: "Μεγάλο διαμέρισμα βόρεια Αθήνα",
    name_en: "Large apartment northern Athens",
    notes_el: "3+ υπνοδωμάτια, ήσυχη γειτονιά, κοντά σε μέτρο.",
    notes_en: "3+ bedrooms, quiet neighbourhood, near metro.",
    locationDisplayName_el: "Βόρεια Αθήνα",
    locationDisplayName_en: "Northern Athens",
  },
];

// ─────────────────────────────────────────────
// Message content pools — 15 messages per channel
// ─────────────────────────────────────────────

const GENERAL_MESSAGES_EL = [
  "Ο πελάτης Παπαδόπουλος θέλει να δει το Κολωνάκι αύριο στις 11:00.",
  "Ανανέωσα τα στοιχεία επικοινωνίας για τον Αλεξίου — email και κινητό.",
  "Νέα αίτηση από portal — αναθέστε σε διαθέσιμο μεσίτη.",
  "Η σύμβαση για το DEMO-P002 υπογράφηκε. Κλεισμένο!",
  "Θυμίζω: ανανέωση άδειας ακινήτου DEMO-P005 στις 30/6.",
  "Ο Γεωργίου επιβεβαίωσε το ραντεβού για Παρασκευή στις 11:00.",
  "Εισαγωγή 20 επαφών από CSV ολοκληρώθηκε επιτυχώς.",
  "Το ακίνητο DEMO-P003 Γλυφάδα ανέβηκε στο portal.",
  "Νέα αντιστοίχιση: R001 ←→ P001 Κολωνάκι (score 87).",
  "Ο πελάτης Κωνσταντίνου ζητά βεβαίωση για το DEMO-P007.",
  "Η Κηφισιά δέχεται προσφορά — καλέστε τον ιδιοκτήτη.",
  "Αύριο αξιολόγηση νέου ακινήτου στη Βάρη στις 15:00.",
  "Ο Χριστοδούλου ρώτησε για επενδύσεις στη Θεσσαλονίκη.",
  "Σύσκεψη ομάδας αύριο 9:00 — παρακαλώ σημειώστε.",
  "Καλή εβδομάδα! Τρία ραντεβού αύριο, τα χαρτιά τυπωμένα.",
];

const GENERAL_MESSAGES_EN = [
  "Client Papadopoulos wants to see the Kolonaki property tomorrow at 11:00.",
  "Updated contact details for Alexiou — email and mobile.",
  "New lead from portal — assign to available agent.",
  "Contract for DEMO-P002 signed. Deal closed!",
  "Reminder: licence renewal for DEMO-P005 on 30/6.",
  "Georgiou confirmed Friday appointment at 11:00.",
  "Import of 20 contacts from CSV completed successfully.",
  "Property DEMO-P003 Glyfada listed on portal.",
  "New match: R001 ←→ P001 Kolonaki (score 87).",
  "Client Konstantinou requests utility certificate for DEMO-P007.",
  "Kifissia property receiving offer — call the owner.",
  "Tomorrow: appraisal of new property in Vari at 15:00.",
  "Christodoulou asked about investment in Thessaloniki.",
  "Team meeting tomorrow at 9:00 — please note.",
  "Good week everyone! Three appointments tomorrow, all paperwork printed.",
];

const SALES_MESSAGES_EL = [
  "Deal Κολωνάκι: ο Παπαδόπουλος αποδέχεται 260k — προχωράμε!",
  "R002 — τρία ακίνητα σε Κηφισιά & Γλυφάδα ταιριάζουν. Στέλνω στον πελάτη.",
  "Γλυφάδα P003 έχει ζήτηση — 2 αιτήματα αυτή τη βδομάδα.",
  "Pipeline update: 1 Signing, 1 Negotiation, 1 Interest.",
  "Ψυχικό P010: ιδιοκτήτης δέχεται επισκέψεις Τρίτη & Πέμπτη.",
  "Νέα lead website — ενδιαφέρεται για Μαρούσι ή Χαλάνδρι.",
  "Βούλα P007 — εκκρεμής προσφορά, αναμένουμε απάντηση.",
  "Αγ. Παρασκευή P013: μπήκε στο χαρτοφυλάκιο χθες.",
  "Γλυφάδα deal σε στάδιο Signing αυτή την εβδομάδα — ειδοποιήστε συμβολαιογράφο.",
  "Ψυχικό P010: ο αγοραστής ζητά νομικό έλεγχο πριν συμφωνήσει.",
  "R004 Νότια Προάστια: Νέα Σμύρνη P008 ιδανική — score 82.",
  "Θεσσαλονίκη P006: δεχόμαστε προσφορά 168k.",
  "Πλάκα P014: ιδιοκτήτης θέλει γρήγορη πώληση εντός μήνα.",
  "R006 tracking: Μαρούσι & Χαλάνδρι στη λίστα για προβολή.",
  "Μηνιαίο summary: 4 ενεργά deals, 6 αιτήματα, 18 ακίνητα.",
];

const SALES_MESSAGES_EN = [
  "Kolonaki deal: Papadopoulos accepts 260k — moving forward!",
  "R002 — three properties in Kifissia & Glyfada match. Sending to client.",
  "Glyfada P003 has demand — 2 requests this week.",
  "Pipeline update: 1 Signing, 1 Negotiation, 1 Interest.",
  "Psychiko P010: owner accepts viewings Tuesdays & Thursdays.",
  "New website lead — interested in Maroussi or Chalandri.",
  "Voula P007 — pending offer, awaiting response.",
  "Ag. Paraskevi P013: added to portfolio yesterday.",
  "Glyfada deal moves to Signing this week — notify notary.",
  "Psychiko P010: buyer requests legal check before agreeing.",
  "R004 Southern Suburbs: Nea Smyrni P008 ideal — score 82.",
  "Thessaloniki P006: accepting offer of 168k.",
  "Plaka P014: owner wants quick sale within the month.",
  "R006 tracking: Maroussi & Chalandri on viewings list.",
  "Monthly summary: 4 active deals, 6 requests, 18 properties.",
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
// Calendar event seed data — 30 events spread across current month
// dayOfMonth: 1–31; seeding code clamps to actual month length.
// ─────────────────────────────────────────────

interface CalendarEventSeed {
  title_el: string;
  title_en: string;
  dayOfMonth: number;
  startHour: number;
  durationHours: number;
  location?: string;
  eventType: "PROPERTY_VIEWING" | "CLIENT_CONSULTATION" | "MEETING";
  propIndex?: number;
  contactIndex?: number;
}

const CALENDAR_EVENT_SEED: CalendarEventSeed[] = [
  // ── PROPERTY_VIEWING (12) ──────────────────────────────────────────────────
  { title_el: "Επίσκεψη Κολωνάκι — Παπαδόπουλος",   title_en: "Kolonaki Viewing — Papadopoulos",  dayOfMonth: 2,  startHour: 11, durationHours: 1,   location: "Κολωνάκι, Αθήνα",   eventType: "PROPERTY_VIEWING",     propIndex: 0,  contactIndex: 0 },
  { title_el: "Επίσκεψη Παγκράτι — Δημητρίου",       title_en: "Pagkrati Viewing — Dimitriou",     dayOfMonth: 3,  startHour: 14, durationHours: 1,   eventType: "PROPERTY_VIEWING",     propIndex: 1,  contactIndex: 3 },
  { title_el: "Επίσκεψη Γλυφάδα — Αλεξίου",          title_en: "Glyfada Viewing — Alexiou",        dayOfMonth: 5,  startHour: 10, durationHours: 1.5, location: "Γλυφάδα",             eventType: "PROPERTY_VIEWING",     propIndex: 2,  contactIndex: 2 },
  { title_el: "Αποτίμηση Μαρούσι",                    title_en: "Maroussi Appraisal",               dayOfMonth: 6,  startHour: 9,  durationHours: 2,   location: "Μαρούσι",             eventType: "PROPERTY_VIEWING",     propIndex: 5 },
  { title_el: "Επίσκεψη Κηφισιά — Κωνσταντίνου",     title_en: "Kifissia Viewing — Konstantinou",  dayOfMonth: 9,  startHour: 11, durationHours: 1,   location: "Κηφισιά",             eventType: "PROPERTY_VIEWING",     propIndex: 4,  contactIndex: 1 },
  { title_el: "Επίσκεψη Νέα Σμύρνη",                  title_en: "Nea Smyrni Viewing",               dayOfMonth: 11, startHour: 15, durationHours: 1,   eventType: "PROPERTY_VIEWING",     propIndex: 8 },
  { title_el: "Επίσκεψη Χαλάνδρι — Αντωνίου",        title_en: "Chalandri Viewing — Antoniou",     dayOfMonth: 13, startHour: 10, durationHours: 1,   location: "Χαλάνδρι",           eventType: "PROPERTY_VIEWING",     propIndex: 9,  contactIndex: 7 },
  { title_el: "Αυτοψία Ψυχικό",                       title_en: "Psychiko On-site Inspection",      dayOfMonth: 16, startHour: 14, durationHours: 2,   location: "Ψυχικό",              eventType: "PROPERTY_VIEWING",     propIndex: 10 },
  { title_el: "Επίσκεψη Βούλα — Γεωργίου",            title_en: "Voula Viewing — Georgiou",         dayOfMonth: 18, startHour: 11, durationHours: 1,   location: "Βούλα",               eventType: "PROPERTY_VIEWING",     propIndex: 7,  contactIndex: 8 },
  { title_el: "Επίσκεψη Αγ. Παρασκευή",               title_en: "Ag. Paraskevi Viewing",            dayOfMonth: 21, startHour: 10, durationHours: 1,   eventType: "PROPERTY_VIEWING",     propIndex: 13 },
  { title_el: "Αποτίμηση Πλάκα",                      title_en: "Plaka Appraisal",                  dayOfMonth: 23, startHour: 16, durationHours: 1,   location: "Πλάκα, Αθήνα",       eventType: "PROPERTY_VIEWING",     propIndex: 14 },
  { title_el: "Επίσκεψη Μελίσσια — Νικολάου",         title_en: "Melissia Viewing — Nikolaou",      dayOfMonth: 26, startHour: 11, durationHours: 1,   location: "Μελίσσια",            eventType: "PROPERTY_VIEWING",     propIndex: 16, contactIndex: 5 },
  // ── CLIENT_CONSULTATION (10) ───────────────────────────────────────────────
  { title_el: "Συνάντηση Χριστοδούλου — επενδυτικό", title_en: "Meeting Christodoulou — investment", dayOfMonth: 2,  startHour: 16, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 6 },
  { title_el: "Παρουσίαση χαρτοφυλακίου ακινήτων",   title_en: "Property portfolio presentation",  dayOfMonth: 4,  startHour: 10, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 4 },
  { title_el: "Συνάντηση Παπαγεωργίου — αίτημα",     title_en: "Meeting Papageorgiou — request",   dayOfMonth: 7,  startHour: 14, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 4 },
  { title_el: "Πρώτη συνάντηση νέας επαφής",          title_en: "First meeting new contact",        dayOfMonth: 10, startHour: 11, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 9 },
  { title_el: "Ανασκόπηση εξέλιξης συμφωνίας",        title_en: "Deal progress review",             dayOfMonth: 12, startHour: 15, durationHours: 1.5, eventType: "CLIENT_CONSULTATION",  contactIndex: 0 },
  { title_el: "Συνάντηση Παπανικολάου — εκτίμηση",    title_en: "Meeting Papanikolaou — valuation", dayOfMonth: 15, startHour: 10, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 10 },
  { title_el: "Παρουσίαση R002 αιτήματος αγοράς",     title_en: "R002 purchase request presentation", dayOfMonth: 19, startHour: 14, durationHours: 1, eventType: "CLIENT_CONSULTATION",  contactIndex: 2 },
  { title_el: "Ενημέρωση πελάτη — εξέλιξη πώλησης",  title_en: "Client update — sale progress",    dayOfMonth: 22, startHour: 11, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 1 },
  { title_el: "Εισαγωγική συνάντηση νέου πελάτη",     title_en: "Intro meeting new client",         dayOfMonth: 25, startHour: 16, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 11 },
  { title_el: "Follow-up — πελάτης αναμένει",         title_en: "Follow-up — client pending",       dayOfMonth: 28, startHour: 14, durationHours: 1,   eventType: "CLIENT_CONSULTATION",  contactIndex: 7 },
  // ── MEETING (8) ────────────────────────────────────────────────────────────
  { title_el: "Εβδομαδιαία σύσκεψη ομάδας",           title_en: "Weekly team meeting",              dayOfMonth: 1,  startHour: 9,  durationHours: 1,   eventType: "MEETING" },
  { title_el: "Εβδομαδιαία σύσκεψη ομάδας",           title_en: "Weekly team meeting",              dayOfMonth: 8,  startHour: 9,  durationHours: 1,   eventType: "MEETING" },
  { title_el: "Εβδομαδιαία σύσκεψη ομάδας",           title_en: "Weekly team meeting",              dayOfMonth: 15, startHour: 9,  durationHours: 1,   eventType: "MEETING" },
  { title_el: "Εβδομαδιαία σύσκεψη ομάδας",           title_en: "Weekly team meeting",              dayOfMonth: 22, startHour: 9,  durationHours: 1,   eventType: "MEETING" },
  { title_el: "Ανασκόπηση pipeline — εβδομάδας",       title_en: "Weekly pipeline review",           dayOfMonth: 5,  startHour: 16, durationHours: 1,   eventType: "MEETING" },
  { title_el: "Ανασκόπηση pipeline — εβδομάδας",       title_en: "Weekly pipeline review",           dayOfMonth: 12, startHour: 16, durationHours: 1,   eventType: "MEETING" },
  { title_el: "Ανασκόπηση pipeline — εβδομάδας",       title_en: "Weekly pipeline review",           dayOfMonth: 19, startHour: 16, durationHours: 1,   eventType: "MEETING" },
  { title_el: "Μηνιαία στοχοθεσία — αξιολόγηση",      title_en: "Monthly goals review",             dayOfMonth: 29, startHour: 14, durationHours: 2,   eventType: "MEETING" },
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
 */
function demoCalendarEventId(orgId: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < orgId.length; i++) {
    hash = (hash * 31 + orgId.charCodeAt(i)) & 0x3fff_ffff;
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
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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

  // ── DealParty — link contacts to deals (6 connections) ──────────────────────
  await prismadb.dealParty.createMany({
    data: [
      { id: `demo_dpty_${orgId}_0`, organizationId: orgId, dealId: `demo_deal_${orgId}_0`, contactId: `demo_contact_${orgId}_0`, role: "BUYER" },
      { id: `demo_dpty_${orgId}_1`, organizationId: orgId, dealId: `demo_deal_${orgId}_0`, contactId: `demo_contact_${orgId}_1`, role: "SELLER" },
      { id: `demo_dpty_${orgId}_2`, organizationId: orgId, dealId: `demo_deal_${orgId}_1`, contactId: `demo_contact_${orgId}_2`, role: "BUYER" },
      { id: `demo_dpty_${orgId}_3`, organizationId: orgId, dealId: `demo_deal_${orgId}_1`, contactId: `demo_contact_${orgId}_4`, role: "SELLER" },
      { id: `demo_dpty_${orgId}_4`, organizationId: orgId, dealId: `demo_deal_${orgId}_2`, contactId: `demo_contact_${orgId}_3`, role: "BUYER" },
      { id: `demo_dpty_${orgId}_5`, organizationId: orgId, dealId: `demo_deal_${orgId}_2`, contactId: `demo_contact_${orgId}_5`, role: "SELLER" },
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

  // ── Calendar events — 30 spread across the current month ────────────────────
  for (let i = 0; i < CALENDAR_EVENT_SEED.length; i++) {
    const ev = CALENDAR_EVENT_SEED[i];
    const calEventId = `demo_calevent_${orgId}_${i}`;

    // Clamp dayOfMonth to the actual number of days in the current month.
    const day = Math.min(ev.dayOfMonth, daysInMonth);
    const startTime = new Date(year, month, day, ev.startHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + ev.durationHours * 3_600_000);

    await prismadb.calendarEvent.upsert({
      where: { id: calEventId },
      create: {
        id: calEventId,
        friendlyId: `DEMO-E${String(i + 1).padStart(3, "0")}`,
        organizationId: orgId,
        calendarEventId: demoCalendarEventId(orgId, i),
        calendarUserId: 0,
        title: isEl ? ev.title_el : ev.title_en,
        description: isEl ? ev.title_el : ev.title_en,
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
      update: { startTime, endTime, updatedAt: now },
    });

    if (ev.propIndex !== undefined) {
      await prismadb.calendarEvent.update({
        where: { id: calEventId },
        data: { Properties: { connect: { id: `demo_prop_${orgId}_${ev.propIndex}` } } },
      });
    }

    if (ev.contactIndex !== undefined) {
      await prismadb.calendarEvent.update({
        where: { id: calEventId },
        data: { Contacts: { connect: { id: `demo_contact_${orgId}_${ev.contactIndex}` } } },
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
// topUpDemoOrg — brings an existing demo org up to the full new dataset.
// Safe to run multiple times (idempotent).
// ─────────────────────────────────────────────

export interface TopUpResult {
  contactsAdded: number;
  propertiesAdded: number;
  requestsAdded: number;
  messagesAdded: number;
  extrasSeeded: boolean;
}

export async function topUpDemoOrg(
  orgId: string,
  userId: string,
  locale: "el" | "en"
): Promise<TopUpResult> {
  const isEl = locale === "el";
  const now = new Date();

  // 1. Contacts — use sequential (non-random) pool selection so top-up is deterministic.
  //    Existing indices 0–N are skipped by skipDuplicates; missing indices are created.
  const contactPool = isEl ? CONTACT_POOL_EL : CONTACT_POOL_EN;
  const contactsRaw = contactPool.slice(0, 20).map((person, i) => ({
    id: `demo_contact_${orgId}_${i}`,
    organizationId: orgId,
    displayName: `${person.firstName} ${person.lastName}`,
    firstName: person.firstName,
    lastName: person.lastName,
    email: `demo.contact${i}@example.com`,
    category: (["BUYER", "SELLER", "INVESTOR"] as const)[i % 3],
    status: "ACTIVE" as const,
    createdBy: userId,
    gdprConsentGiven: true,
    gdprConsentDate: new Date(),
  }));

  const encryptedContacts = await Promise.all(
    contactsRaw.map((c) => encryptContactForOrg(c, orgId))
  );
  const { count: contactsAdded } = await prismadb.contact.createMany({
    data: encryptedContacts as never,
    skipDuplicates: true,
  });

  // 2. Properties — all 18
  const propertiesRaw = PROPERTY_SEED.map((p, i) => {
    const property_name = isEl
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

  const encryptedProperties = (await Promise.all(
    propertiesRaw.map((p) => encryptPropertyForOrg(p as never, orgId))
  )) as unknown as typeof propertiesRaw;

  const { count: propertiesAdded } = await prismadb.properties.createMany({
    data: encryptedProperties as unknown as Prisma.PropertiesCreateManyInput[],
    skipDuplicates: true,
  });

  // 3. Requests — all 6
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

  const { count: requestsAdded } = await prismadb.request.createMany({
    data: encryptedRequests,
    skipDuplicates: true,
  });

  // 4. Channels — find-or-create general + sales, top up messages if below threshold
  const generalMessages = isEl ? GENERAL_MESSAGES_EL : GENERAL_MESSAGES_EN;
  const salesMessages = isEl ? SALES_MESSAGES_EL : SALES_MESSAGES_EN;
  let messagesAdded = 0;

  // General channel
  let generalChannel = await prismadb.channel.findFirst({
    where: { organizationId: orgId, slug: "general" },
    select: { id: true, _count: { select: { messages: true } } },
  });
  if (!generalChannel) {
    generalChannel = await prismadb.channel.create({
      data: {
        organizationId: orgId,
        name: isEl ? "Γενικά" : "General",
        slug: "general",
        isDefault: true,
        isE2ee: false,
        createdById: userId,
      },
      select: { id: true, _count: { select: { messages: true } } },
    });
    await prismadb.channelMember.create({ data: { channelId: generalChannel.id, userId } });
  }
  if (generalChannel._count.messages < 15) {
    const res = await prismadb.message.createMany({
      data: generalMessages.map((content, i) => ({
        organizationId: orgId,
        channelId: generalChannel!.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(now.getTime() - (generalMessages.length - i) * 3_600_000),
      })),
    });
    messagesAdded += res.count;
  }

  // Sales channel
  let salesChannel = await prismadb.channel.findFirst({
    where: { organizationId: orgId, slug: "sales" },
    select: { id: true, _count: { select: { messages: true } } },
  });
  if (!salesChannel) {
    salesChannel = await prismadb.channel.create({
      data: {
        organizationId: orgId,
        name: isEl ? "Πωλήσεις" : "Sales",
        slug: "sales",
        isDefault: false,
        isE2ee: false,
        createdById: userId,
      },
      select: { id: true, _count: { select: { messages: true } } },
    });
    await prismadb.channelMember.create({ data: { channelId: salesChannel.id, userId } });
  }
  if (salesChannel._count.messages < 15) {
    const res = await prismadb.message.createMany({
      data: salesMessages.map((content, i) => ({
        organizationId: orgId,
        channelId: salesChannel!.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(now.getTime() - (salesMessages.length - i) * 3_600_000 - 86_400_000),
      })),
    });
    messagesAdded += res.count;
  }

  // 5. Deals, notifications, calendar events, tasks — already idempotent via skipDuplicates/upsert
  await seedDemoOrgExtras(orgId, userId, locale);

  return { contactsAdded, propertiesAdded, requestsAdded, messagesAdded, extrasSeeded: true };
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
  const selectedContacts = pickN(contactPool, 20);
  const generalMessages = isEl ? GENERAL_MESSAGES_EL : GENERAL_MESSAGES_EN;
  const salesMessages = isEl ? SALES_MESSAGES_EL : SALES_MESSAGES_EN;
  const propertyCommentTexts = isEl ? PROPERTY_COMMENT_EL : PROPERTY_COMMENT_EN;
  const contactCommentTexts = isEl ? CONTACT_COMMENT_EL : CONTACT_COMMENT_EN;
  const now = new Date();

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

    // 2a. General channel
    const generalChannel = await db.channel.create({
      data: {
        organizationId: orgId,
        name: isEl ? "Γενικά" : "General",
        slug: "general",
        isDefault: true,
        isE2ee: false,
        createdById: userId,
      },
    });
    await db.channelMember.create({ data: { channelId: generalChannel.id, userId } });

    // 2b. Sales channel (second channel — at least 2 required)
    const salesChannel = await db.channel.create({
      data: {
        organizationId: orgId,
        name: isEl ? "Πωλήσεις" : "Sales",
        slug: "sales",
        isDefault: false,
        isE2ee: false,
        createdById: userId,
      },
    });
    await db.channelMember.create({ data: { channelId: salesChannel.id, userId } });

    // 3. Contacts
    await db.contact.createMany({ data: encryptedContacts });

    // 4. Properties
    await db.properties.createMany({
      data: encryptedProperties as unknown as Prisma.PropertiesCreateManyInput[],
    });

    // 5. Requests
    await db.request.createMany({ data: encryptedRequests });

    // 6. General channel messages (15)
    await db.message.createMany({
      data: generalMessages.map((content, i) => ({
        organizationId: orgId,
        channelId: generalChannel.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(now.getTime() - (generalMessages.length - i) * 3_600_000),
      })),
    });

    // 7. Sales channel messages (15)
    await db.message.createMany({
      data: salesMessages.map((content, i) => ({
        organizationId: orgId,
        channelId: salesChannel.id,
        senderId: userId,
        content,
        contentType: "TEXT" as const,
        createdAt: new Date(now.getTime() - (salesMessages.length - i) * 3_600_000 - 86_400_000),
      })),
    });

    // 8. Documents (linked to first 4 properties)
    await db.documents.createMany({
      data: [
        {
          id: `demo_doc_${orgId}_0`,
          friendlyId: "DEMO-D001",
          organizationId: orgId,
          document_name: isEl ? "Πιστοποιητικό Ενέργειας — Κολωνάκι" : "Energy Certificate — Kolonaki",
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
          document_name: isEl ? "Κάτοψη Ακινήτου — Παγκράτι" : "Floor Plan — Pagkrati",
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
          linkedPropertiesIds: [`demo_prop_${orgId}_2`],
          contactsIDs: [`demo_contact_${orgId}_0`],
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
          contactsIDs: [`demo_contact_${orgId}_1`],
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
