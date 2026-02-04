/**
 * Greek Postal Code to Municipality/Area Mapping
 * 
 * This file contains static data for Greek postal codes (Ταχυδρομικός Κώδικας - ΤΚ)
 * covering major cities and areas. Used for fast offline lookups.
 * Falls back to Photon API for comprehensive coverage.
 */

export interface GreekPostalCodeData {
  postalCode: string;
  municipality: string;
  area?: string;
  region?: string;
}

/**
 * Static mapping of Greek postal codes to municipalities and areas
 * Focuses on major metropolitan areas (Athens, Thessaloniki, etc.)
 * 
 * Format: postal code -> municipality, area, region
 */
export const GREEK_POSTAL_CODES: GreekPostalCodeData[] = [
  // Athens Metropolitan Area - Central Athens
  { postalCode: "10431", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10432", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10433", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10434", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10435", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10436", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10437", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10438", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10439", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10440", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10441", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10442", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10443", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10444", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10445", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10446", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  { postalCode: "10447", municipality: "Αθήνα", area: "Κέντρο", region: "Αττική" },
  
  // Northern Suburbs
  { postalCode: "14561", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14562", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14563", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14564", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14565", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14575", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14576", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14577", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14578", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  { postalCode: "14579", municipality: "Κηφισιά", area: "Κηφισιά", region: "Αττική" },
  
  { postalCode: "15121", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15122", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15123", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15124", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15125", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15126", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  { postalCode: "15127", municipality: "Μαρούσι", area: "Μαρούσι", region: "Αττική" },
  
  { postalCode: "15231", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15232", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15233", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15234", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15235", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15236", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15237", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  { postalCode: "15238", municipality: "Χαλάνδρι", area: "Χαλάνδρι", region: "Αττική" },
  
  // Southern Suburbs
  { postalCode: "17455", municipality: "Γλυφάδα", area: "Γλυφάδα", region: "Αττική" },
  { postalCode: "17456", municipality: "Γλυφάδα", area: "Γλυφάδα", region: "Αττική" },
  { postalCode: "17457", municipality: "Γλυφάδα", area: "Γλυφάδα", region: "Αττική" },
  
  { postalCode: "17671", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  { postalCode: "17672", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  { postalCode: "17673", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  { postalCode: "17674", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  { postalCode: "17675", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  { postalCode: "17676", municipality: "Καλλιθέα", area: "Καλλιθέα", region: "Αττική" },
  
  { postalCode: "18344", municipality: "Μοσχάτο", area: "Μοσχάτο", region: "Αττική" },
  { postalCode: "18345", municipality: "Μοσχάτο", area: "Μοσχάτο", region: "Αττική" },
  { postalCode: "18346", municipality: "Μοσχάτο", area: "Μοσχάτο", region: "Αττική" },
  
  // Western Suburbs
  { postalCode: "12131", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12132", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12133", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12134", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12135", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12136", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  { postalCode: "12137", municipality: "Περιστέρι", area: "Περιστέρι", region: "Αττική" },
  
  { postalCode: "12241", municipality: "Αιγάλεω", area: "Αιγάλεω", region: "Αττική" },
  { postalCode: "12242", municipality: "Αιγάλεω", area: "Αιγάλεω", region: "Αττική" },
  { postalCode: "12243", municipality: "Αιγάλεω", area: "Αιγάλεω", region: "Αττική" },
  { postalCode: "12244", municipality: "Αιγάλεω", area: "Αιγάλεω", region: "Αττική" },
  
  // Piraeus Area
  { postalCode: "18531", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18532", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18533", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18534", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18535", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18536", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18537", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18538", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18539", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18540", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18541", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18542", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18543", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18544", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18545", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18546", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  { postalCode: "18547", municipality: "Πειραιάς", area: "Πειραιάς", region: "Αττική" },
  
  // Thessaloniki
  { postalCode: "54621", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54622", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54623", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54624", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54625", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54626", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54627", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54628", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54629", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54630", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54631", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54632", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54633", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54634", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54635", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54636", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54637", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54638", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54639", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54640", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54641", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54642", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54643", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54644", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54645", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  { postalCode: "54646", municipality: "Θεσσαλονίκη", area: "Κέντρο", region: "Κεντρική Μακεδονία" },
  
  // Patras
  { postalCode: "26221", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  { postalCode: "26222", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  { postalCode: "26223", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  { postalCode: "26224", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  { postalCode: "26225", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  { postalCode: "26226", municipality: "Πάτρα", area: "Κέντρο", region: "Δυτική Ελλάδα" },
  
  // Heraklion (Crete)
  { postalCode: "71201", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71202", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71203", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71204", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71205", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71206", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71207", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71208", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "71209", municipality: "Ηράκλειο", area: "Κέντρο", region: "Κρήτη" },
  
  // Larissa
  { postalCode: "41331", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "41332", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "41333", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "41334", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "41335", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "41336", municipality: "Λάρισα", area: "Κέντρο", region: "Θεσσαλία" },
  
  // Volos
  { postalCode: "38221", municipality: "Βόλος", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "38222", municipality: "Βόλος", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "38223", municipality: "Βόλος", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "38224", municipality: "Βόλος", area: "Κέντρο", region: "Θεσσαλία" },
  { postalCode: "38225", municipality: "Βόλος", area: "Κέντρο", region: "Θεσσαλία" },
  
  // Ioannina
  { postalCode: "45221", municipality: "Ιωάννινα", area: "Κέντρο", region: "Ήπειρος" },
  { postalCode: "45222", municipality: "Ιωάννινα", area: "Κέντρο", region: "Ήπειρος" },
  { postalCode: "45223", municipality: "Ιωάννινα", area: "Κέντρο", region: "Ήπειρος" },
  { postalCode: "45224", municipality: "Ιωάννινα", area: "Κέντρο", region: "Ήπειρος" },
  
  // Kavala
  { postalCode: "65302", municipality: "Καβάλα", area: "Κέντρο", region: "Ανατολική Μακεδονία" },
  { postalCode: "65303", municipality: "Καβάλα", area: "Κέντρο", region: "Ανατολική Μακεδονία" },
  { postalCode: "65304", municipality: "Καβάλα", area: "Κέντρο", region: "Ανατολική Μακεδονία" },
  
  // Rhodes
  { postalCode: "85100", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  { postalCode: "85101", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  { postalCode: "85102", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  { postalCode: "85103", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  { postalCode: "85104", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  { postalCode: "85105", municipality: "Ρόδος", area: "Κέντρο", region: "Νότιο Αιγαίο" },
  
  // Chania (Crete)
  { postalCode: "73100", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "73131", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "73132", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "73133", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "73134", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
  { postalCode: "73135", municipality: "Χανιά", area: "Κέντρο", region: "Κρήτη" },
];

/**
 * Lookup postal code in static data
 */
export function lookupPostalCode(postalCode: string): GreekPostalCodeData | null {
  const normalized = postalCode.trim().replace(/\s+/g, "");
  return GREEK_POSTAL_CODES.find((entry) => entry.postalCode === normalized) || null;
}

/**
 * Lookup municipality in static data
 * Returns all postal codes for that municipality
 */
export function lookupMunicipality(municipality: string): GreekPostalCodeData[] {
  const normalized = municipality.trim().toLowerCase();
  return GREEK_POSTAL_CODES.filter(
    (entry) => entry.municipality.toLowerCase() === normalized
  );
}

/**
 * Search postal codes by partial municipality name
 */
export function searchMunicipality(query: string): GreekPostalCodeData[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  
  return GREEK_POSTAL_CODES.filter(
    (entry) =>
      entry.municipality.toLowerCase().includes(normalized) ||
      (entry.area && entry.area.toLowerCase().includes(normalized))
  );
}
