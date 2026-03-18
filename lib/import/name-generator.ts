/**
 * Name generators for import auto-naming
 *
 * Used when mandate titles or client names are not explicitly provided
 * in the import source data.
 */

import { normalizeEnumValue, transactionTypeMap } from "./enum-normalizer";

/**
 * Human-readable labels for transaction types (from mandate/buyer perspective).
 */
const TX_LABELS: Record<string, string> = {
  SALE: "Buy",
  RENTAL: "Rent",
  SHORT_TERM: "Short-term",
  EXCHANGE: "Exchange",
  AUCTION: "Auction",
};

/**
 * Generate a mandate title from import row data.
 *
 * The `mandateRow` must already have prefix-stripped keys
 * (e.g. `transaction_type`, not `mandate_transaction_type`).
 *
 * Priority:
 * 1. transaction_type + property_type → "Buy Apartment Glyfada"
 * 2. transaction_type only            → "Rent mandate"
 * 3. clientName provided              → "Mandate for Nikos Papadopoulos"
 * 4. propertyName provided            → "Mandate for Glyfada Apartment"
 * 5. fallback                         → "Mandate"
 */
export function generateMandateTitle(
  mandateRow: Record<string, unknown>,
  clientName: string | null,
  propertyName: string | null,
): string {
  const rawTxType = mandateRow["transaction_type"];
  const normalizedTxType = normalizeEnumValue(rawTxType, transactionTypeMap);
  const txLabel = normalizedTxType ? TX_LABELS[normalizedTxType] : null;

  if (txLabel) {
    const propertyType = mandateRow["property_type"];
    const area = mandateRow["area"] ?? mandateRow["location"] ?? mandateRow["city"] ?? null;

    if (propertyType && typeof propertyType === "string" && propertyType.trim()) {
      // Capitalise first letter, lowercase rest for display
      const ptDisplay =
        propertyType.charAt(0).toUpperCase() +
        propertyType.slice(1).toLowerCase();

      if (area && typeof area === "string" && area.trim()) {
        return `${txLabel} ${ptDisplay} ${area.trim()}`;
      }
      return `${txLabel} ${ptDisplay}`;
    }

    return `${txLabel} mandate`;
  }

  if (clientName) {
    return `Mandate for ${clientName}`;
  }

  if (propertyName) {
    return `Mandate for ${propertyName}`;
  }

  return "Mandate";
}

/**
 * Generate a client display name when no explicit name is provided.
 *
 * Priority:
 * 1. primary_phone → "Contact (6944...456)"  (first 4 + … + last 3)
 * 2. primary_email → "Contact (nikos@gmail.com)"
 * 3. fallback      → "Contact"
 */
export function generateClientName(clientRow: Record<string, unknown>): string {
  const phone = clientRow["primary_phone"];
  if (phone && typeof phone === "string" && phone.trim()) {
    const p = phone.trim();
    if (p.length >= 7) {
      const masked = `${p.slice(0, 4)}...${p.slice(-3)}`;
      return `Contact (${masked})`;
    }
    return `Contact (${p})`;
  }

  const email = clientRow["primary_email"];
  if (email && typeof email === "string" && email.trim()) {
    return `Contact (${email.trim()})`;
  }

  return "Contact";
}
