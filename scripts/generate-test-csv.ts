/**
 * Generate a large CSV file with 500 properties using
 * REALISTIC but NON-MATCHING field names to test import mapping
 * 
 * Run with: npx tsx scripts/generate-test-csv.ts
 */

import * as fs from "fs";
import * as path from "path";

// Greek cities/areas for realistic data
const greekCities = [
  "Αθήνα", "Θεσσαλονίκη", "Πειραιάς", "Πάτρα", "Ηράκλειο", 
  "Λάρισα", "Βόλος", "Χανιά", "Καλαμαριά", "Γλυφάδα",
  "Athens", "Thessaloniki", "Piraeus", "Patras", "Heraklion"
];

const greekAreas = [
  "Κολωνάκι", "Κηφισιά", "Μαρούσι", "Νέα Σμύρνη", "Παλαιό Φάληρο",
  "Χαλάνδρι", "Βούλα", "Βουλιαγμένη", "Περιστέρι", "Καλλιθέα",
  "Kolonaki", "Kifisia", "Marousi", "Nea Smyrni", "Chalandri"
];

const streetNames = [
  "Ερμού", "Σταδίου", "Πανεπιστημίου", "Ακαδημίας", "Λεωφ. Κηφισίας",
  "Λ. Αλεξάνδρας", "Πατησίων", "Βασ. Σοφίας", "Βασ. Κωνσταντίνου",
  "Hermou St", "Stadiou Av", "Kifisias Ave", "Vassilissis Sofias"
];

// Property types with variations
const propTypes = [
  "Διαμέρισμα", "Μονοκατοικία", "Μεζονέτα", "Οικόπεδο", "Κατάστημα",
  "Γραφείο", "Αποθήκη", "Βιομηχανικός Χώρος", "Flat", "Apartment",
  "House", "Villa", "Maisonette", "Land", "Shop", "Office", "Studio"
];

// Transaction types with variations  
const txnTypes = [
  "Πώληση", "Ενοικίαση", "Βραχυχρόνια", "ΠΩΛΕΙΤΑΙ", "ΕΝΟΙΚΙΑΖΕΤΑΙ",
  "For Sale", "For Rent", "Sale", "Rent", "Lease", "Short Term"
];

// Status variations
const statuses = [
  "Διαθέσιμο", "Υπό Διαπραγμάτευση", "Πωλήθηκε", "Αποσύρθηκε",
  "Active", "Available", "Under Offer", "Sold", "Rented", "Off Market"
];

// Heating types variations
const heatingTypes = [
  "Αυτόνομη", "Κεντρική", "Φ/Α", "Αντλία Θερμότητας", "Ηλεκτρική",
  "Autonomous", "Central", "Gas", "Heat Pump", "Electric", "Oil"
];

// Energy classes
const energyClasses = ["Α+", "Α", "Β", "Β+", "Γ", "Δ", "Ε", "ΣΤ", "Ζ", "Η", "A", "B", "C", "D", "E", "F", "G"];

// Conditions
const conditions = [
  "Άριστη", "Πολύ Καλή", "Καλή", "Χρήζει Ανακαίνισης", "Υπό Κατασκευή",
  "Excellent", "Very Good", "Good", "Needs Renovation", "New", "Renovated"
];

// Furnished options
const furnishedOptions = [
  "Επιπλωμένο", "Ημιεπιπλωμένο", "Χωρίς Έπιπλα",
  "Furnished", "Semi-Furnished", "Unfurnished", "Yes", "No", "Partially"
];

// Random helper functions
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function maybe<T>(value: T, probability = 0.7): T | "" {
  return Math.random() < probability ? value : "";
}

function randPrice(type: string): number {
  if (type.toLowerCase().includes("rent") || type.includes("Ενοικ") || type.includes("ΕΝΟΙΚ")) {
    return rand(300, 5000);
  }
  return rand(50000, 2500000);
}

function randEmail(): string {
  const domains = ["gmail.com", "yahoo.gr", "outlook.com", "realestate.gr", "agency.gr"];
  const names = ["info", "contact", "sales", "office", "property", "agent"];
  return `${pick(names)}${rand(1, 999)}@${pick(domains)}`;
}

function randPhone(): string {
  const prefixes = ["210", "211", "231", "69", "698", "699"];
  return `${pick(prefixes)} ${rand(1000000, 9999999)}`;
}

// Generate a single property with random non-matching field names
function generateProperty(id: number): Record<string, string | number> {
  const txnType = pick(txnTypes);
  const city = pick(greekCities);
  const area = pick(greekAreas);
  const propType = pick(propTypes);
  
  return {
    // Different naming conventions an external MLS might use
    "Listing ID": `EXT-${rand(10000, 99999)}`,
    "Title": `${propType} ${rand(30, 300)}τμ στην ${area}`,
    "Property Category": propType,
    "Listing Status": pick(statuses),
    "Transaction": txnType,
    "Asking Price (EUR)": randPrice(txnType),
    "Price/sqm": maybe(rand(500, 5000), 0.4),
    "Street Address": maybe(`${pick(streetNames)} ${rand(1, 200)}`, 0.8),
    "City/Town": city,
    "Region": maybe(pick(["Αττική", "Κεντρική Μακεδονία", "Κρήτη", "Attica", "Central Macedonia"]), 0.6),
    "Postal/ZIP": maybe(`${rand(10000, 19999)}`, 0.7),
    "Neighborhood": area,
    "District": maybe(pick(["Βόρεια Προάστια", "Νότια Προάστια", "Κέντρο", "North Suburbs", "South Suburbs"]), 0.5),
    "Total Area (m²)": rand(25, 500),
    "Living Space (m²)": maybe(rand(20, 450), 0.6),
    "Plot Area (m²)": maybe(rand(100, 5000), 0.3),
    "Num Bedrooms": maybe(rand(0, 6), 0.8),
    "Num Bathrooms": maybe(rand(1, 4), 0.75),
    "WC": maybe(rand(0, 2), 0.3),
    "Level/Floor": maybe(pick(["Ισόγειο", "1ος", "2ος", "3ος", "4ος", "5ος", "Ground", "1st", "2nd", "3rd", "Basement"]), 0.7),
    "Total Floors": maybe(rand(1, 10), 0.6),
    "Year Constructed": maybe(rand(1950, 2024), 0.65),
    "Renovation Year": maybe(rand(2000, 2024), 0.25),
    "Heating System": maybe(pick(heatingTypes), 0.7),
    "Energy Rating": maybe(pick(energyClasses), 0.55),
    "Property Condition": maybe(pick(conditions), 0.6),
    "Has Elevator": maybe(pick(["Ναι", "Όχι", "Yes", "No", "1", "0", "TRUE", "FALSE"]), 0.5),
    "Furnishing": maybe(pick(furnishedOptions), 0.4),
    "Parking Spots": maybe(rand(0, 3), 0.45),
    "Storage Room": maybe(pick(["Ναι", "Όχι", "Yes", "No"]), 0.35),
    "Balcony (m²)": maybe(rand(5, 50), 0.5),
    "Garden (m²)": maybe(rand(20, 500), 0.2),
    "Pool": maybe(pick(["Ναι", "Όχι", "Yes", "No"]), 0.15),
    "Monthly Expenses": maybe(rand(30, 500), 0.4),
    "Building Permit #": maybe(`ΑΔ-${rand(1000, 9999)}/${rand(2000, 2024)}`, 0.2),
    "Cadastre Code": maybe(`${rand(10, 99)}${rand(100, 999)}${rand(10, 99)}${rand(10000, 99999)}`, 0.15),
    "View Type": maybe(pick(["Θάλασσα", "Βουνό", "Πόλη", "Πάρκο", "Sea", "Mountain", "City", "Park"]), 0.4),
    "Orientation": maybe(pick(["Νότιος", "Βόρειος", "Ανατολικός", "Δυτικός", "South", "North", "East", "West"]), 0.35),
    "Pets Allowed": maybe(pick(["Ναι", "Όχι", "Yes", "No", "Negotiable"]), 0.3),
    "Min Rental Period": maybe(pick(["6 μήνες", "12 μήνες", "24 μήνες", "6 months", "1 year", "2 years"]), 0.25),
    "Available From": maybe(`${rand(1, 28)}/${rand(1, 12)}/${rand(2024, 2025)}`, 0.35),
    "Description": maybe(`${propType} ${rand(30, 300)}τμ με ${rand(1, 5)} υπνοδωμάτια. ${pick(["Φωτεινό", "Ανακαινισμένο", "Διαμπερές", "Ευρύχωρο"])} με θέα ${pick(["θάλασσα", "βουνό", "πόλη", "πράσινο"])}.`, 0.8),
    "Agent Email": maybe(randEmail(), 0.6),
    "Agent Phone": maybe(randPhone(), 0.5),
    "Exclusive Listing": maybe(pick(["Ναι", "Όχι", "Yes", "No"]), 0.3),
    "Online Visibility": maybe(pick(["Public", "Private", "Selected", "Δημόσιο", "Ιδιωτικό"]), 0.4),
    "Last Updated": `${rand(1, 28)}/${rand(1, 12)}/2024`,
    "Internal Notes": maybe(`Property ${id} - ${pick(["Hot lead", "Negotiable", "Owner abroad", "Quick sale", "Πρώτη κατοικία"])}`, 0.2),
    "Commission (%)": maybe(rand(1, 5), 0.3),
    "Key Location": maybe(pick(["Office", "Owner", "On-site", "Γραφείο", "Ιδιοκτήτης"]), 0.25),
    "Virtual Tour URL": maybe(`https://360tour.example.com/${rand(10000, 99999)}`, 0.1),
    "MLS Code": maybe(`MLS-${rand(100000, 999999)}`, 0.3),
  };
}

// Generate CSV content
function generateCSV(count: number): string {
  const properties = Array.from({ length: count }, (_, i) => generateProperty(i + 1));
  
  // Get all unique headers
  const headers = Object.keys(properties[0]);
  
  // Build CSV
  const headerRow = headers.map(h => `"${h}"`).join(",");
  const dataRows = properties.map(prop => 
    headers.map(h => {
      const val = prop[h];
      if (val === "" || val === undefined) return "";
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(",")
  );
  
  return [headerRow, ...dataRows].join("\n");
}

// Main execution
const OUTPUT_PATH = path.join(__dirname, "../public/templates/test_external_properties_500.csv");
const csv = generateCSV(500);

fs.writeFileSync(OUTPUT_PATH, csv, "utf-8");
console.log(`✅ Generated ${OUTPUT_PATH}`);
console.log(`   Total rows: 500 properties`);
console.log(`   File size: ${(Buffer.byteLength(csv, "utf-8") / 1024).toFixed(1)} KB`);


