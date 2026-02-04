import { TemplateType } from "@prisma/client";

export interface TemplatePlaceholder {
  key: string;
  labelEn: string;
  labelEl: string;
  type: "text" | "date" | "number" | "currency" | "boolean" | "select";
  required: boolean;
  autoFillFrom?: "property" | "client" | "agent" | "organization";
  autoFillField?: string;
  options?: { value: string; labelEn: string; labelEl: string }[];
  defaultValue?: string;
}

export interface TemplateDefinition {
  type: TemplateType;
  name: string;
  nameEn: string;
  nameEl: string;
  descriptionEn: string;
  descriptionEl: string;
  placeholders: TemplatePlaceholder[];
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // 1. Brokerage Mandate (Εντολή Ανάθεσης Μεσιτείας)
  {
    type: "BROKERAGE_MANDATE",
    name: "brokerage-mandate",
    nameEn: "Brokerage Mandate",
    nameEl: "Εντολή Ανάθεσης Μεσιτείας",
    descriptionEn:
      "Authorization form for real estate agent to sell or rent a property on behalf of the owner.",
    descriptionEl:
      "Έντυπο εξουσιοδότησης μεσίτη για πώληση ή ενοικίαση ακινήτου εκ μέρους του ιδιοκτήτη.",
    placeholders: [
      // Owner Details
      {
        key: "owner_name",
        labelEn: "Owner Full Name",
        labelEl: "Ονοματεπώνυμο Ιδιοκτήτη",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "client_name",
      },
      {
        key: "owner_id_number",
        labelEn: "Owner ID/Passport Number",
        labelEl: "Αριθμός Ταυτότητας/Διαβατηρίου",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "id_doc",
      },
      {
        key: "owner_afm",
        labelEn: "Owner Tax ID (ΑΦΜ)",
        labelEl: "ΑΦΜ Ιδιοκτήτη",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "afm",
      },
      {
        key: "owner_address",
        labelEn: "Owner Address",
        labelEl: "Διεύθυνση Ιδιοκτήτη",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "billing_street",
      },
      {
        key: "owner_phone",
        labelEn: "Owner Phone",
        labelEl: "Τηλέφωνο Ιδιοκτήτη",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "primary_phone",
      },
      {
        key: "owner_email",
        labelEn: "Owner Email",
        labelEl: "Email Ιδιοκτήτη",
        type: "text",
        required: false,
        autoFillFrom: "client",
        autoFillField: "primary_email",
      },
      // Property Details
      {
        key: "property_address",
        labelEn: "Property Address",
        labelEl: "Διεύθυνση Ακινήτου",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "address_street",
      },
      {
        key: "property_area",
        labelEn: "Area/Municipality",
        labelEl: "Περιοχή/Δήμος",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "municipality",
      },
      {
        key: "property_type",
        labelEn: "Property Type",
        labelEl: "Είδος Ακινήτου",
        type: "select",
        required: true,
        autoFillFrom: "property",
        autoFillField: "property_type",
        options: [
          { value: "APARTMENT", labelEn: "Apartment", labelEl: "Διαμέρισμα" },
          { value: "HOUSE", labelEn: "House", labelEl: "Μονοκατοικία" },
          { value: "MAISONETTE", labelEn: "Maisonette", labelEl: "Μεζονέτα" },
          { value: "COMMERCIAL", labelEn: "Commercial", labelEl: "Επαγγελματικός χώρος" },
          { value: "LAND", labelEn: "Land", labelEl: "Οικόπεδο" },
          { value: "PARKING", labelEn: "Parking", labelEl: "Θέση στάθμευσης" },
          { value: "WAREHOUSE", labelEn: "Warehouse", labelEl: "Αποθήκη" },
        ],
      },
      {
        key: "property_size",
        labelEn: "Size (sqm)",
        labelEl: "Εμβαδόν (τ.μ.)",
        type: "number",
        required: true,
        autoFillFrom: "property",
        autoFillField: "size_net_sqm",
      },
      {
        key: "property_floor",
        labelEn: "Floor",
        labelEl: "Όροφος",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "floor",
      },
      {
        key: "property_kaek",
        labelEn: "Land Registry (ΚΑΕΚ)",
        labelEl: "ΚΑΕΚ Κτηματολογίου",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "land_registry_kaek",
      },
      // Commission Terms
      {
        key: "transaction_type",
        labelEn: "Transaction Type",
        labelEl: "Είδος Συναλλαγής",
        type: "select",
        required: true,
        autoFillFrom: "property",
        autoFillField: "transaction_type",
        options: [
          { value: "SALE", labelEn: "Sale", labelEl: "Πώληση" },
          { value: "RENTAL", labelEn: "Rental", labelEl: "Ενοικίαση" },
        ],
      },
      {
        key: "asking_price",
        labelEn: "Asking Price (€)",
        labelEl: "Ζητούμενη Τιμή (€)",
        type: "currency",
        required: true,
        autoFillFrom: "property",
        autoFillField: "price",
      },
      {
        key: "commission_percentage",
        labelEn: "Commission (%)",
        labelEl: "Ποσοστό Αμοιβής (%)",
        type: "number",
        required: true,
        defaultValue: "2",
      },
      {
        key: "is_exclusive",
        labelEn: "Exclusive Mandate",
        labelEl: "Αποκλειστική Ανάθεση",
        type: "boolean",
        required: true,
        autoFillFrom: "property",
        autoFillField: "is_exclusive",
        defaultValue: "false",
      },
      {
        key: "mandate_duration_months",
        labelEn: "Duration (months)",
        labelEl: "Διάρκεια (μήνες)",
        type: "number",
        required: true,
        defaultValue: "6",
      },
      {
        key: "mandate_start_date",
        labelEn: "Start Date",
        labelEl: "Ημερομηνία Έναρξης",
        type: "date",
        required: true,
      },
      // Agency Details
      {
        key: "agency_name",
        labelEn: "Agency Name",
        labelEl: "Επωνυμία Μεσιτικού Γραφείου",
        type: "text",
        required: true,
        autoFillFrom: "organization",
        autoFillField: "company_name",
      },
      {
        key: "agency_afm",
        labelEn: "Agency Tax ID (ΑΦΜ)",
        labelEl: "ΑΦΜ Μεσιτικού Γραφείου",
        type: "text",
        required: true,
        autoFillFrom: "organization",
        autoFillField: "VAT_number",
      },
      {
        key: "agent_name",
        labelEn: "Agent Name",
        labelEl: "Όνομα Μεσίτη",
        type: "text",
        required: true,
        autoFillFrom: "agent",
        autoFillField: "name",
      },
      {
        key: "place_of_signing",
        labelEn: "Place of Signing",
        labelEl: "Τόπος Υπογραφής",
        type: "text",
        required: true,
      },
    ],
  },

  // 2. Residential Lease Agreement (Ιδιωτικό Συμφωνητικό Μίσθωσης)
  {
    type: "LEASE_AGREEMENT",
    name: "lease-agreement",
    nameEn: "Residential Lease Agreement",
    nameEl: "Ιδιωτικό Συμφωνητικό Μίσθωσης Κατοικίας",
    descriptionEn: "Standard rental contract for residential properties in Greece.",
    descriptionEl: "Τυποποιημένο συμβόλαιο μίσθωσης για κατοικίες στην Ελλάδα.",
    placeholders: [
      // Landlord Details
      {
        key: "landlord_name",
        labelEn: "Landlord Full Name",
        labelEl: "Ονοματεπώνυμο Εκμισθωτή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "client_name",
      },
      {
        key: "landlord_id_number",
        labelEn: "Landlord ID Number",
        labelEl: "Αριθμός Ταυτότητας Εκμισθωτή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "id_doc",
      },
      {
        key: "landlord_afm",
        labelEn: "Landlord Tax ID (ΑΦΜ)",
        labelEl: "ΑΦΜ Εκμισθωτή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "afm",
      },
      {
        key: "landlord_address",
        labelEn: "Landlord Address",
        labelEl: "Διεύθυνση Εκμισθωτή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "billing_street",
      },
      {
        key: "landlord_phone",
        labelEn: "Landlord Phone",
        labelEl: "Τηλέφωνο Εκμισθωτή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "primary_phone",
      },
      // Tenant Details
      {
        key: "tenant_name",
        labelEn: "Tenant Full Name",
        labelEl: "Ονοματεπώνυμο Μισθωτή",
        type: "text",
        required: true,
      },
      {
        key: "tenant_id_number",
        labelEn: "Tenant ID Number",
        labelEl: "Αριθμός Ταυτότητας Μισθωτή",
        type: "text",
        required: true,
      },
      {
        key: "tenant_afm",
        labelEn: "Tenant Tax ID (ΑΦΜ)",
        labelEl: "ΑΦΜ Μισθωτή",
        type: "text",
        required: true,
      },
      {
        key: "tenant_phone",
        labelEn: "Tenant Phone",
        labelEl: "Τηλέφωνο Μισθωτή",
        type: "text",
        required: true,
      },
      {
        key: "tenant_email",
        labelEn: "Tenant Email",
        labelEl: "Email Μισθωτή",
        type: "text",
        required: false,
      },
      // Property Details
      {
        key: "property_address",
        labelEn: "Property Address",
        labelEl: "Διεύθυνση Ακινήτου",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "address_street",
      },
      {
        key: "property_area",
        labelEn: "Area/Municipality",
        labelEl: "Περιοχή/Δήμος",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "municipality",
      },
      {
        key: "property_floor",
        labelEn: "Floor",
        labelEl: "Όροφος",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "floor",
      },
      {
        key: "property_size",
        labelEn: "Size (sqm)",
        labelEl: "Εμβαδόν (τ.μ.)",
        type: "number",
        required: true,
        autoFillFrom: "property",
        autoFillField: "size_net_sqm",
      },
      {
        key: "property_bedrooms",
        labelEn: "Bedrooms",
        labelEl: "Υπνοδωμάτια",
        type: "number",
        required: false,
        autoFillFrom: "property",
        autoFillField: "bedrooms",
      },
      {
        key: "property_description",
        labelEn: "Property Description",
        labelEl: "Περιγραφή Ακινήτου",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "description",
      },
      // Lease Terms
      {
        key: "monthly_rent",
        labelEn: "Monthly Rent (€)",
        labelEl: "Μηνιαίο Μίσθωμα (€)",
        type: "currency",
        required: true,
        autoFillFrom: "property",
        autoFillField: "price",
      },
      {
        key: "deposit_amount",
        labelEn: "Security Deposit (€)",
        labelEl: "Εγγύηση (€)",
        type: "currency",
        required: true,
      },
      {
        key: "payment_day",
        labelEn: "Rent Payment Day",
        labelEl: "Ημέρα Πληρωμής Ενοικίου",
        type: "number",
        required: true,
        defaultValue: "1",
      },
      {
        key: "lease_start_date",
        labelEn: "Lease Start Date",
        labelEl: "Ημερομηνία Έναρξης Μίσθωσης",
        type: "date",
        required: true,
      },
      {
        key: "lease_duration_years",
        labelEn: "Lease Duration (years)",
        labelEl: "Διάρκεια Μίσθωσης (έτη)",
        type: "number",
        required: true,
        defaultValue: "3",
      },
      {
        key: "permitted_use",
        labelEn: "Permitted Use",
        labelEl: "Χρήση Μισθίου",
        type: "select",
        required: true,
        options: [
          { value: "RESIDENCE", labelEn: "Residence", labelEl: "Κατοικία" },
          { value: "OFFICE", labelEn: "Office", labelEl: "Γραφείο" },
          { value: "STORAGE", labelEn: "Storage", labelEl: "Αποθήκη" },
        ],
        defaultValue: "RESIDENCE",
      },
      {
        key: "utilities_included",
        labelEn: "Utilities Included",
        labelEl: "Κοινόχρηστα Συμπεριλαμβάνονται",
        type: "boolean",
        required: true,
        defaultValue: "false",
      },
      {
        key: "pets_allowed",
        labelEn: "Pets Allowed",
        labelEl: "Επιτρέπονται Κατοικίδια",
        type: "boolean",
        required: true,
        autoFillFrom: "property",
        autoFillField: "accepts_pets",
        defaultValue: "false",
      },
      {
        key: "place_of_signing",
        labelEn: "Place of Signing",
        labelEl: "Τόπος Υπογραφής",
        type: "text",
        required: true,
      },
    ],
  },

  // 3. Property Handover Protocol (Πρωτόκολλο Παράδοσης-Παραλαβής)
  {
    type: "HANDOVER_PROTOCOL",
    name: "handover-protocol",
    nameEn: "Property Handover Protocol",
    nameEl: "Πρωτόκολλο Παράδοσης-Παραλαβής",
    descriptionEn:
      "Document recording the condition of the property at handover, including meter readings and inventory.",
    descriptionEl:
      "Έγγραφο καταγραφής της κατάστασης του ακινήτου κατά την παράδοση, συμπεριλαμβανομένων μετρητών και εξοπλισμού.",
    placeholders: [
      // Parties
      {
        key: "landlord_name",
        labelEn: "Landlord/Seller Name",
        labelEl: "Ονοματεπώνυμο Εκμισθωτή/Πωλητή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "client_name",
      },
      {
        key: "landlord_phone",
        labelEn: "Landlord/Seller Phone",
        labelEl: "Τηλέφωνο Εκμισθωτή/Πωλητή",
        type: "text",
        required: true,
        autoFillFrom: "client",
        autoFillField: "primary_phone",
      },
      {
        key: "tenant_buyer_name",
        labelEn: "Tenant/Buyer Name",
        labelEl: "Ονοματεπώνυμο Μισθωτή/Αγοραστή",
        type: "text",
        required: true,
      },
      {
        key: "tenant_buyer_phone",
        labelEn: "Tenant/Buyer Phone",
        labelEl: "Τηλέφωνο Μισθωτή/Αγοραστή",
        type: "text",
        required: true,
      },
      // Property
      {
        key: "property_address",
        labelEn: "Property Address",
        labelEl: "Διεύθυνση Ακινήτου",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "address_street",
      },
      {
        key: "property_floor",
        labelEn: "Floor",
        labelEl: "Όροφος",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "floor",
      },
      {
        key: "handover_date",
        labelEn: "Handover Date",
        labelEl: "Ημερομηνία Παράδοσης",
        type: "date",
        required: true,
      },
      {
        key: "handover_type",
        labelEn: "Handover Type",
        labelEl: "Είδος Παράδοσης",
        type: "select",
        required: true,
        options: [
          { value: "RENTAL_START", labelEn: "Rental Start", labelEl: "Έναρξη Μίσθωσης" },
          { value: "RENTAL_END", labelEn: "Rental End", labelEl: "Λήξη Μίσθωσης" },
          { value: "SALE", labelEn: "Sale", labelEl: "Πώληση" },
        ],
      },
      // Meter Readings
      {
        key: "electricity_meter_number",
        labelEn: "Electricity Meter Number",
        labelEl: "Αριθμός Μετρητή ΔΕΗ",
        type: "text",
        required: false,
      },
      {
        key: "electricity_reading",
        labelEn: "Electricity Reading",
        labelEl: "Ένδειξη Ηλεκτρικού",
        type: "number",
        required: false,
      },
      {
        key: "water_meter_number",
        labelEn: "Water Meter Number",
        labelEl: "Αριθμός Μετρητή Νερού",
        type: "text",
        required: false,
      },
      {
        key: "water_reading",
        labelEn: "Water Reading",
        labelEl: "Ένδειξη Νερού",
        type: "number",
        required: false,
      },
      {
        key: "gas_meter_number",
        labelEn: "Gas Meter Number",
        labelEl: "Αριθμός Μετρητή Φυσικού Αερίου",
        type: "text",
        required: false,
      },
      {
        key: "gas_reading",
        labelEn: "Gas Reading",
        labelEl: "Ένδειξη Φυσικού Αερίου",
        type: "number",
        required: false,
      },
      // Keys
      {
        key: "main_door_keys",
        labelEn: "Main Door Keys (qty)",
        labelEl: "Κλειδιά Κεντρικής Πόρτας (αριθμός)",
        type: "number",
        required: true,
        defaultValue: "2",
      },
      {
        key: "building_entrance_keys",
        labelEn: "Building Entrance Keys (qty)",
        labelEl: "Κλειδιά Εισόδου Πολυκατοικίας (αριθμός)",
        type: "number",
        required: false,
      },
      {
        key: "mailbox_keys",
        labelEn: "Mailbox Keys (qty)",
        labelEl: "Κλειδιά Γραμματοκιβωτίου (αριθμός)",
        type: "number",
        required: false,
      },
      {
        key: "garage_remote",
        labelEn: "Garage Remote (qty)",
        labelEl: "Τηλεχειριστήριο Γκαράζ (αριθμός)",
        type: "number",
        required: false,
      },
      // Condition
      {
        key: "overall_condition",
        labelEn: "Overall Condition",
        labelEl: "Γενική Κατάσταση",
        type: "select",
        required: true,
        autoFillFrom: "property",
        autoFillField: "condition",
        options: [
          { value: "EXCELLENT", labelEn: "Excellent", labelEl: "Άριστη" },
          { value: "VERY_GOOD", labelEn: "Very Good", labelEl: "Πολύ Καλή" },
          { value: "GOOD", labelEn: "Good", labelEl: "Καλή" },
          { value: "FAIR", labelEn: "Fair", labelEl: "Μέτρια" },
          { value: "NEEDS_REPAIR", labelEn: "Needs Repair", labelEl: "Χρειάζεται Επισκευή" },
        ],
      },
      {
        key: "condition_notes",
        labelEn: "Condition Notes / Damages",
        labelEl: "Σημειώσεις Κατάστασης / Φθορές",
        type: "text",
        required: false,
      },
      {
        key: "furniture_inventory",
        labelEn: "Furniture/Appliances Inventory",
        labelEl: "Κατάλογος Επίπλων/Συσκευών",
        type: "text",
        required: false,
      },
      {
        key: "place_of_signing",
        labelEn: "Place of Signing",
        labelEl: "Τόπος Υπογραφής",
        type: "text",
        required: true,
      },
    ],
  },

  // 4. Property Viewing Confirmation (Βεβαίωση Επίσκεψης Ακινήτου)
  {
    type: "VIEWING_CONFIRMATION",
    name: "viewing-confirmation",
    nameEn: "Property Viewing Confirmation",
    nameEl: "Βεβαίωση Επίσκεψης Ακινήτου",
    descriptionEn:
      "Confirmation that a potential buyer/tenant has viewed the property through the agency.",
    descriptionEl:
      "Βεβαίωση ότι ένας υποψήφιος αγοραστής/ενοικιαστής επισκέφθηκε το ακίνητο μέσω του μεσιτικού γραφείου.",
    placeholders: [
      // Visitor Details
      {
        key: "visitor_name",
        labelEn: "Visitor Full Name",
        labelEl: "Ονοματεπώνυμο Επισκέπτη",
        type: "text",
        required: true,
      },
      {
        key: "visitor_id_number",
        labelEn: "Visitor ID Number",
        labelEl: "Αριθμός Ταυτότητας Επισκέπτη",
        type: "text",
        required: true,
      },
      {
        key: "visitor_phone",
        labelEn: "Visitor Phone",
        labelEl: "Τηλέφωνο Επισκέπτη",
        type: "text",
        required: true,
      },
      {
        key: "visitor_email",
        labelEn: "Visitor Email",
        labelEl: "Email Επισκέπτη",
        type: "text",
        required: false,
      },
      {
        key: "visitor_intent",
        labelEn: "Interest Type",
        labelEl: "Ενδιαφέρον για",
        type: "select",
        required: true,
        options: [
          { value: "BUY", labelEn: "Purchase", labelEl: "Αγορά" },
          { value: "RENT", labelEn: "Rental", labelEl: "Ενοικίαση" },
        ],
      },
      // Property Details
      {
        key: "property_address",
        labelEn: "Property Address",
        labelEl: "Διεύθυνση Ακινήτου",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "address_street",
      },
      {
        key: "property_area",
        labelEn: "Area/Municipality",
        labelEl: "Περιοχή/Δήμος",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "municipality",
      },
      {
        key: "property_type",
        labelEn: "Property Type",
        labelEl: "Είδος Ακινήτου",
        type: "text",
        required: true,
        autoFillFrom: "property",
        autoFillField: "property_type",
      },
      {
        key: "property_code",
        labelEn: "Property Reference Code",
        labelEl: "Κωδικός Ακινήτου",
        type: "text",
        required: false,
        autoFillFrom: "property",
        autoFillField: "id",
      },
      // Viewing Details
      {
        key: "viewing_date",
        labelEn: "Viewing Date",
        labelEl: "Ημερομηνία Επίσκεψης",
        type: "date",
        required: true,
      },
      {
        key: "viewing_time",
        labelEn: "Viewing Time",
        labelEl: "Ώρα Επίσκεψης",
        type: "text",
        required: true,
      },
      // Agency Details
      {
        key: "agency_name",
        labelEn: "Agency Name",
        labelEl: "Επωνυμία Μεσιτικού Γραφείου",
        type: "text",
        required: true,
        autoFillFrom: "organization",
        autoFillField: "company_name",
      },
      {
        key: "agent_name",
        labelEn: "Accompanying Agent",
        labelEl: "Συνοδός Μεσίτης",
        type: "text",
        required: true,
        autoFillFrom: "agent",
        autoFillField: "name",
      },
      {
        key: "agent_phone",
        labelEn: "Agent Phone",
        labelEl: "Τηλέφωνο Μεσίτη",
        type: "text",
        required: false,
        autoFillFrom: "organization",
        autoFillField: "phone",
      },
      // Legal acknowledgment
      {
        key: "acknowledge_agency",
        labelEn: "Visitor acknowledges viewing through agency",
        labelEl: "Ο επισκέπτης αναγνωρίζει ότι η επίσκεψη έγινε μέσω του γραφείου",
        type: "boolean",
        required: true,
        defaultValue: "true",
      },
      {
        key: "place_of_signing",
        labelEn: "Place of Signing",
        labelEl: "Τόπος Υπογραφής",
        type: "text",
        required: true,
      },
    ],
  },
];

// Helper to get a template definition by type
export function getTemplateDefinition(type: TemplateType): TemplateDefinition | undefined {
  return TEMPLATE_DEFINITIONS.find((t) => t.type === type);
}

// Get all active template definitions
export function getAllTemplateDefinitions(): TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS;
}



