/**
 * Deal serialization helpers for the Server → Client component boundary.
 *
 * Prisma's `Decimal` class instances cannot cross Next.js's RSC serialization
 * boundary ("Only plain objects can be passed to Client Components from Server
 * Components"). These helpers flatten Decimals to plain numbers so that deals
 * fetched server-side can be passed as props to client components or as JSON
 * responses from API routes.
 */
import { Prisma } from "@prisma/client";

/**
 * Convert a Prisma `Decimal` (or already-plain number/null) to a plain number.
 */
export function decToNumber(
  v: Prisma.Decimal | number | null | undefined
): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  // Prisma Decimal exposes `toNumber()`; fall back to Number() for safety.
  return typeof (v as { toNumber?: () => number }).toNumber === "function"
    ? (v as { toNumber: () => number }).toNumber()
    : Number(v);
}

/**
 * Recursively serialize a Deal (with any subset of relations) so it's safe
 * to pass across the Server → Client boundary. Converts all `Decimal` fields
 * on the deal and its common relations (`property`, `request`) to plain
 * numbers while preserving everything else structurally.
 *
 * Accepts `unknown` input (the caller's `include` shape varies) and returns
 * a structurally-similar plain object.
 */
export function serializeDealForClient<T extends Record<string, unknown>>(
  deal: T
): T {
  const DECIMAL_FIELDS = [
    "agreedPrice",
    "totalCommission",
    "commissionRate",
    "depositAmount",
    "listingAgentSplit",
    "buyerAgentSplit",
    "monthlyRentAmount",
    "securityDeposit",
    "hoursWorked",
  ] as const;

  const result: Record<string, unknown> = { ...deal };

  for (const field of DECIMAL_FIELDS) {
    if (field in result) {
      result[field] = decToNumber(
        result[field] as Prisma.Decimal | number | null | undefined
      );
    }
  }

  // `property` relation has Decimal columns: price, size_net_sqm, size_gross_sqm
  const property = result.property as Record<string, unknown> | null | undefined;
  if (property && typeof property === "object") {
    result.property = {
      ...property,
      price: decToNumber(property.price as Prisma.Decimal | number | null | undefined),
      ...("size_net_sqm" in property && {
        size_net_sqm: decToNumber(property.size_net_sqm as Prisma.Decimal | number | null | undefined),
      }),
      ...("size_gross_sqm" in property && {
        size_gross_sqm: decToNumber(property.size_gross_sqm as Prisma.Decimal | number | null | undefined),
      }),
      ...("square_feet" in property && {
        square_feet: decToNumber(property.square_feet as Prisma.Decimal | number | null | undefined),
      }),
    };
  }

  // `request` relation carries Decimal `budgetMin` / `budgetMax` when selected
  const request = result.request as Record<string, unknown> | null | undefined;
  if (request && typeof request === "object") {
    result.request = {
      ...request,
      ...("budgetMin" in request && {
        budgetMin: decToNumber(
          request.budgetMin as Prisma.Decimal | number | null | undefined
        ),
      }),
      ...("budgetMax" in request && {
        budgetMax: decToNumber(
          request.budgetMax as Prisma.Decimal | number | null | undefined
        ),
      }),
    };
  }

  return result as T;
}
