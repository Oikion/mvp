/**
 * Script to generate DOCX template files
 * Run with: npx ts-node scripts/generate-docx-templates.ts
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "../public/templates");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to create a section heading
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
  });
}

// Helper to create a field row
function fieldRow(label: string, placeholder: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: `{{${placeholder}}}` }),
    ],
  });
}

// Helper to create signature section
function signatureSection(leftTitle: string, rightTitle: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [
              new Paragraph({ text: "", spacing: { after: 600 } }),
              new Paragraph({
                text: "____________________",
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: leftTitle,
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NIL },
              bottom: { style: BorderStyle.NIL },
              left: { style: BorderStyle.NIL },
              right: { style: BorderStyle.NIL },
            },
            children: [
              new Paragraph({ text: "", spacing: { after: 600 } }),
              new Paragraph({
                text: "____________________",
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: rightTitle,
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// 1. Brokerage Mandate Template
async function createBrokerageMandate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ΕΝΤΟΛΗ ΑΝΑΘΕΣΗΣ ΜΕΣΙΤΕΙΑΣ",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "BROKERAGE MANDATE",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΕΝΤΟΛΕΑ (Owner Details)"),
          fieldRow("Ονοματεπώνυμο / Full Name", "owner_name"),
          fieldRow("Αριθμός Ταυτότητας / ID Number", "owner_id_number"),
          fieldRow("ΑΦΜ / Tax ID", "owner_afm"),
          fieldRow("Διεύθυνση / Address", "owner_address"),
          fieldRow("Τηλέφωνο / Phone", "owner_phone"),
          fieldRow("Email", "owner_email"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ (Property Details)"),
          fieldRow("Διεύθυνση Ακινήτου / Property Address", "property_address"),
          fieldRow("Περιοχή/Δήμος / Area", "property_area"),
          fieldRow("Είδος Ακινήτου / Property Type", "property_type"),
          fieldRow("Εμβαδόν (τ.μ.) / Size (sqm)", "property_size"),
          fieldRow("Όροφος / Floor", "property_floor"),
          fieldRow("ΚΑΕΚ Κτηματολογίου / Land Registry", "property_kaek"),

          sectionHeading("ΟΡΟΙ ΑΝΑΘΕΣΗΣ (Mandate Terms)"),
          fieldRow("Είδος Συναλλαγής / Transaction Type", "transaction_type"),
          fieldRow("Ζητούμενη Τιμή / Asking Price", "asking_price"),
          fieldRow("Ποσοστό Αμοιβής / Commission %", "commission_percentage"),
          fieldRow("Αποκλειστική Ανάθεση / Exclusive", "is_exclusive"),
          fieldRow("Διάρκεια (μήνες) / Duration (months)", "mandate_duration_months"),
          fieldRow("Ημερομηνία Έναρξης / Start Date", "mandate_start_date"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΜΕΣΙΤΙΚΟΥ ΓΡΑΦΕΙΟΥ (Agency Details)"),
          fieldRow("Επωνυμία / Agency Name", "agency_name"),
          fieldRow("ΑΦΜ Γραφείου / Agency Tax ID", "agency_afm"),
          fieldRow("Όνομα Μεσίτη / Agent Name", "agent_name"),

          new Paragraph({
            text: "Ο εντολέας αναθέτει στο ανωτέρω μεσιτικό γραφείο την διαμεσολάβηση για την πώληση ή μίσθωση του περιγραφόμενου ακινήτου.",
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "The principal assigns to the above agency the mediation for the sale or rental of the described property.",
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "Τόπος / Place: {{place_of_signing}}    Ημερομηνία / Date: {{mandate_start_date}}",
            spacing: { before: 400 },
          }),

          signatureSection("Ο Εντολέας / The Principal", "Ο Μεσίτης / The Agent"),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUTPUT_DIR, "brokerage-mandate.docx"), buffer);
  console.log("✓ Created brokerage-mandate.docx");
}

// 2. Lease Agreement Template
async function createLeaseAgreement() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ ΜΙΣΘΩΣΗΣ ΚΑΤΟΙΚΙΑΣ",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "RESIDENTIAL LEASE AGREEMENT",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΕΚΜΙΣΘΩΤΗ (Landlord Details)"),
          fieldRow("Ονοματεπώνυμο / Full Name", "landlord_name"),
          fieldRow("Αριθμός Ταυτότητας / ID Number", "landlord_id_number"),
          fieldRow("ΑΦΜ / Tax ID", "landlord_afm"),
          fieldRow("Διεύθυνση / Address", "landlord_address"),
          fieldRow("Τηλέφωνο / Phone", "landlord_phone"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΜΙΣΘΩΤΗ (Tenant Details)"),
          fieldRow("Ονοματεπώνυμο / Full Name", "tenant_name"),
          fieldRow("Αριθμός Ταυτότητας / ID Number", "tenant_id_number"),
          fieldRow("ΑΦΜ / Tax ID", "tenant_afm"),
          fieldRow("Τηλέφωνο / Phone", "tenant_phone"),
          fieldRow("Email", "tenant_email"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΜΙΣΘΙΟΥ (Property Details)"),
          fieldRow("Διεύθυνση / Address", "property_address"),
          fieldRow("Περιοχή / Area", "property_area"),
          fieldRow("Όροφος / Floor", "property_floor"),
          fieldRow("Εμβαδόν (τ.μ.) / Size (sqm)", "property_size"),
          fieldRow("Υπνοδωμάτια / Bedrooms", "property_bedrooms"),

          sectionHeading("ΟΡΟΙ ΜΙΣΘΩΣΗΣ (Lease Terms)"),
          fieldRow("Μηνιαίο Μίσθωμα / Monthly Rent", "monthly_rent"),
          fieldRow("Εγγύηση / Deposit", "deposit_amount"),
          fieldRow("Ημέρα Πληρωμής / Payment Day", "payment_day"),
          fieldRow("Ημερομηνία Έναρξης / Start Date", "lease_start_date"),
          fieldRow("Διάρκεια (έτη) / Duration (years)", "lease_duration_years"),
          fieldRow("Χρήση / Permitted Use", "permitted_use"),
          fieldRow("Κοινόχρηστα / Utilities Included", "utilities_included"),
          fieldRow("Κατοικίδια / Pets Allowed", "pets_allowed"),

          new Paragraph({
            text: "Το παρόν μισθωτήριο διέπεται από τις διατάξεις του Αστικού Κώδικα και του Ν. 4242/2014.",
            spacing: { before: 400, after: 400 },
          }),

          new Paragraph({
            text: "Τόπος / Place: {{place_of_signing}}    Ημερομηνία / Date: {{lease_start_date}}",
            spacing: { before: 400 },
          }),

          signatureSection("Ο Εκμισθωτής / The Landlord", "Ο Μισθωτής / The Tenant"),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUTPUT_DIR, "lease-agreement.docx"), buffer);
  console.log("✓ Created lease-agreement.docx");
}

// 3. Handover Protocol Template
async function createHandoverProtocol() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ΠΡΩΤΟΚΟΛΛΟ ΠΑΡΑΔΟΣΗΣ - ΠΑΡΑΛΑΒΗΣ",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "PROPERTY HANDOVER PROTOCOL",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          sectionHeading("ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ (Parties)"),
          fieldRow("Εκμισθωτής/Πωλητής / Landlord/Seller", "landlord_name"),
          fieldRow("Τηλέφωνο / Phone", "landlord_phone"),
          fieldRow("Μισθωτής/Αγοραστής / Tenant/Buyer", "tenant_buyer_name"),
          fieldRow("Τηλέφωνο / Phone", "tenant_buyer_phone"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ (Property Details)"),
          fieldRow("Διεύθυνση / Address", "property_address"),
          fieldRow("Όροφος / Floor", "property_floor"),
          fieldRow("Ημερομηνία Παράδοσης / Handover Date", "handover_date"),
          fieldRow("Είδος Παράδοσης / Handover Type", "handover_type"),

          sectionHeading("ΕΝΔΕΙΞΕΙΣ ΜΕΤΡΗΤΩΝ (Meter Readings)"),
          fieldRow("Αρ. Μετρητή ΔΕΗ / Electricity Meter No.", "electricity_meter_number"),
          fieldRow("Ένδειξη / Reading", "electricity_reading"),
          fieldRow("Αρ. Μετρητή Νερού / Water Meter No.", "water_meter_number"),
          fieldRow("Ένδειξη / Reading", "water_reading"),
          fieldRow("Αρ. Μετρητή Φυσικού Αερίου / Gas Meter No.", "gas_meter_number"),
          fieldRow("Ένδειξη / Reading", "gas_reading"),

          sectionHeading("ΚΛΕΙΔΙΑ (Keys)"),
          fieldRow("Κλειδιά Κεντρικής Πόρτας / Main Door Keys", "main_door_keys"),
          fieldRow("Κλειδιά Εισόδου / Building Entrance Keys", "building_entrance_keys"),
          fieldRow("Κλειδιά Γραμματοκιβωτίου / Mailbox Keys", "mailbox_keys"),
          fieldRow("Τηλεχειριστήριο Γκαράζ / Garage Remote", "garage_remote"),

          sectionHeading("ΚΑΤΑΣΤΑΣΗ ΑΚΙΝΗΤΟΥ (Condition)"),
          fieldRow("Γενική Κατάσταση / Overall Condition", "overall_condition"),
          fieldRow("Σημειώσεις/Φθορές / Notes/Damages", "condition_notes"),
          fieldRow("Κατάλογος Επίπλων / Furniture Inventory", "furniture_inventory"),

          new Paragraph({
            text: "Τόπος / Place: {{place_of_signing}}    Ημερομηνία / Date: {{handover_date}}",
            spacing: { before: 400 },
          }),

          signatureSection("Ο Παραδίδων / The Deliverer", "Ο Παραλαμβάνων / The Receiver"),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUTPUT_DIR, "handover-protocol.docx"), buffer);
  console.log("✓ Created handover-protocol.docx");
}

// 4. Viewing Confirmation Template
async function createViewingConfirmation() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ΒΕΒΑΙΩΣΗ ΕΠΙΣΚΕΨΗΣ ΑΚΙΝΗΤΟΥ",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "PROPERTY VIEWING CONFIRMATION",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΠΤΗ (Visitor Details)"),
          fieldRow("Ονοματεπώνυμο / Full Name", "visitor_name"),
          fieldRow("Αριθμός Ταυτότητας / ID Number", "visitor_id_number"),
          fieldRow("Τηλέφωνο / Phone", "visitor_phone"),
          fieldRow("Email", "visitor_email"),
          fieldRow("Ενδιαφέρον για / Interest Type", "visitor_intent"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ (Property Details)"),
          fieldRow("Διεύθυνση / Address", "property_address"),
          fieldRow("Περιοχή / Area", "property_area"),
          fieldRow("Είδος Ακινήτου / Property Type", "property_type"),
          fieldRow("Κωδικός Ακινήτου / Property Code", "property_code"),

          sectionHeading("ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΨΗΣ (Viewing Details)"),
          fieldRow("Ημερομηνία Επίσκεψης / Viewing Date", "viewing_date"),
          fieldRow("Ώρα Επίσκεψης / Viewing Time", "viewing_time"),
          fieldRow("Μεσιτικό Γραφείο / Agency Name", "agency_name"),
          fieldRow("Συνοδός Μεσίτης / Agent Name", "agent_name"),
          fieldRow("Τηλέφωνο Μεσίτη / Agent Phone", "agent_phone"),

          new Paragraph({
            text: "Ο επισκέπτης βεβαιώνει ότι επισκέφθηκε το ανωτέρω ακίνητο μέσω του αναφερόμενου μεσιτικού γραφείου και αναγνωρίζει το δικαίωμα του γραφείου στη νόμιμη αμοιβή σε περίπτωση κατάρτισης συμφωνίας.",
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "The visitor confirms viewing the above property through the mentioned agency and acknowledges the agency's right to commission in case of an agreement.",
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "Τόπος / Place: {{place_of_signing}}    Ημερομηνία / Date: {{viewing_date}}",
            spacing: { before: 400 },
          }),

          signatureSection("Ο Επισκέπτης / The Visitor", "Ο Μεσίτης / The Agent"),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUTPUT_DIR, "viewing-confirmation.docx"), buffer);
  console.log("✓ Created viewing-confirmation.docx");
}

// Run all generators
async function main() {
  console.log("Generating DOCX templates...\n");

  await createBrokerageMandate();
  await createLeaseAgreement();
  await createHandoverProtocol();
  await createViewingConfirmation();

  console.log("\n✓ All templates generated successfully!");
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);




