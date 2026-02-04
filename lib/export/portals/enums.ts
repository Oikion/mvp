/**
 * Greek Portal Enum Mappings
 * 
 * Centralized enum mappings for Greek real estate portals.
 * This file contains no imports to avoid circular dependencies.
 */

// ============================================
// ENUM MAPPINGS
// ============================================

/**
 * Standard property type mappings for Greek portals
 */
export const PROPERTY_TYPE_GREEK: Record<string, string> = {
  RESIDENTIAL: "Κατοικία",
  COMMERCIAL: "Επαγγελματικό",
  LAND: "Οικόπεδο",
  RENTAL: "Ενοικίαση",
  VACATION: "Παραθεριστικό",
  APARTMENT: "Διαμέρισμα",
  HOUSE: "Μονοκατοικία",
  MAISONETTE: "Μεζονέτα",
  WAREHOUSE: "Αποθήκη",
  PARKING: "Χώρος Στάθμευσης",
  PLOT: "Οικόπεδο",
  FARM: "Αγρόκτημα",
  INDUSTRIAL: "Βιομηχανικό",
  OTHER: "Άλλο",
};

/**
 * Transaction type mappings for Greek portals
 */
export const TRANSACTION_TYPE_GREEK: Record<string, string> = {
  SALE: "Πώληση",
  RENTAL: "Ενοικίαση",
  SHORT_TERM: "Βραχυχρόνια Μίσθωση",
  EXCHANGE: "Ανταλλαγή",
};

/**
 * Heating type mappings for Greek portals
 */
export const HEATING_TYPE_GREEK: Record<string, string> = {
  AUTONOMOUS: "Αυτόνομη",
  CENTRAL: "Κεντρική",
  NATURAL_GAS: "Φυσικό Αέριο",
  HEAT_PUMP: "Αντλία Θερμότητας",
  ELECTRIC: "Ηλεκτρική",
  NONE: "Χωρίς",
};

/**
 * Energy certificate class mappings
 */
export const ENERGY_CLASS_GREEK: Record<string, string> = {
  A_PLUS: "Α+",
  A: "Α",
  B: "Β",
  C: "Γ",
  D: "Δ",
  E: "Ε",
  F: "Ζ",
  G: "Η",
  H: "Θ",
  IN_PROGRESS: "Υπό Έκδοση",
};

/**
 * Furnished status mappings
 */
export const FURNISHED_GREEK: Record<string, string> = {
  NO: "Χωρίς Επίπλωση",
  PARTIALLY: "Ημιεπιπλωμένο",
  FULLY: "Πλήρως Επιπλωμένο",
};

/**
 * Property condition mappings
 */
export const CONDITION_GREEK: Record<string, string> = {
  EXCELLENT: "Άριστη",
  VERY_GOOD: "Πολύ Καλή",
  GOOD: "Καλή",
  NEEDS_RENOVATION: "Χρήζει Ανακαίνισης",
};

/**
 * Property status mappings
 */
export const STATUS_GREEK: Record<string, string> = {
  ACTIVE: "Διαθέσιμο",
  PENDING: "Υπό Διαπραγμάτευση",
  SOLD: "Πωλήθηκε",
  OFF_MARKET: "Εκτός Αγοράς",
  WITHDRAWN: "Αποσύρθηκε",
};
