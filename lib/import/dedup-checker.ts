/**
 * lib/import/dedup-checker.ts
 *
 * Cross-batch deduplication: checks the database for existing entities
 * that match the incoming import rows BEFORE creation.
 *
 * Contact fields are encrypted with per-org DEKs, so matching requires
 * fetching all org contacts, decrypting in memory, and comparing.
 * Property fields (address, KAEK) are plaintext — a direct WHERE query suffices.
 *
 * Each entity type costs exactly ONE database round-trip for the entire batch.
 */

import { prismadb } from "@/lib/prisma";
import { decryptWithKey, isEncrypted } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateMatch {
  dedupKey: string;
  existingId: string;
  existingFriendlyId: string | null;
}

export interface DedupCheckResult {
  contacts: Map<string, DuplicateMatch>;
  properties: Map<string, DuplicateMatch>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeDecrypt(value: string | null | undefined, dek: Buffer): string {
  if (!value) return "";
  if (!isEncrypted(value)) return value;
  try {
    return decryptWithKey(value, dek);
  } catch {
    // Orphaned or corrupted ciphertext (e.g. rotated DEK without fallback).
    // The contact is excluded from dedup matching — a re-import will create a
    // duplicate rather than silently skip. Log at warn so the misconfiguration
    // is visible in production logs without exposing PII.
    console.warn("[IMPORT_DEDUP] safeDecrypt failed — contact excluded from dedup matching");
    return "";
  }
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Contact dedup — org-wide scan + decrypt
//
// One round-trip: fetch all active org contacts, decrypt phone/email/name,
// normalize, and intersect against the incoming dedup keys.
// ---------------------------------------------------------------------------

async function checkContactDuplicates(
  dedupKeys: Set<string>,
  orgId: string,
  dek: Buffer,
): Promise<Map<string, DuplicateMatch>> {
  if (dedupKeys.size === 0) return new Map();

  const existing = await prismadb.contact.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      friendlyId: true,
      primaryPhone: true,
      email: true,
      displayName: true,
    },
  });

  const result = new Map<string, DuplicateMatch>();

  for (const contact of existing) {
    // Decrypt and normalize — try each dedup key priority in turn.
    // name: matches are intentionally last-resort: they fire only when phone and
    // email are both absent. Common names (e.g. "Γιώργης Παπαδόπουλος") carry
    // false-positive risk — callers should communicate this to users via UI copy.
    const phone = normalizePhone(safeDecrypt(contact.primaryPhone, dek));
    const email = safeDecrypt(contact.email, dek).trim().toLowerCase();
    const name = safeDecrypt(contact.displayName, dek).trim().toLowerCase();

    const match: DuplicateMatch = {
      dedupKey: "",
      existingId: contact.id,
      existingFriendlyId: contact.friendlyId,
    };

    if (phone && dedupKeys.has(`phone:${phone}`)) {
      match.dedupKey = `phone:${phone}`;
      result.set(match.dedupKey, match);
    } else if (email && dedupKeys.has(`email:${email}`)) {
      match.dedupKey = `email:${email}`;
      result.set(match.dedupKey, match);
    } else if (name && dedupKeys.has(`name:${name}`)) {
      match.dedupKey = `name:${name}`;
      result.set(match.dedupKey, match);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Property dedup — plaintext fields, targeted query
//
// Supports three key types (priority order):
//   kaek:XXXXX       — land_registry_kaek (strongest: unique per parcel)
//   addr:street|city — address composite
//   name:propname    — property_name fallback
//
// One round-trip with OR conditions covering all incoming dedup keys.
// ---------------------------------------------------------------------------

async function checkPropertyDuplicates(
  dedupKeys: Set<string>,
  orgId: string,
): Promise<Map<string, DuplicateMatch>> {
  if (dedupKeys.size === 0) return new Map();

  const kaekValues: string[] = [];
  const addressPairs: { street: string; city: string }[] = [];
  const nameValues: string[] = [];

  for (const key of Array.from(dedupKeys)) {
    if (key.startsWith("kaek:")) {
      const kaek = key.slice(5).trim();
      if (kaek) kaekValues.push(kaek);
    } else if (key.startsWith("addr:")) {
      const rest = key.slice(5);
      const pipeIdx = rest.indexOf("|");
      if (pipeIdx !== -1) {
        const street = rest.slice(0, pipeIdx).trim();
        const city = rest.slice(pipeIdx + 1).trim();
        if (street) addressPairs.push({ street, city });
      }
    } else if (key.startsWith("name:")) {
      const name = key.slice(5).trim();
      if (name) nameValues.push(name);
    }
  }

  // Build OR conditions — only include populated types.
  // Typed as Prisma.PropertiesWhereInput so field name typos are caught at compile time.
  const orConditions: Prisma.PropertiesWhereInput[] = [
    ...(kaekValues.length > 0
      ? [{ land_registry_kaek: { in: kaekValues } } as Prisma.PropertiesWhereInput]
      : []),
    ...addressPairs.map(({ street, city }) => ({
      address_street: { equals: street, mode: "insensitive" as const },
      address_city: { equals: city, mode: "insensitive" as const },
    })),
    ...(nameValues.length > 0
      ? nameValues.map((n) => ({
          property_name: { equals: n, mode: "insensitive" as const },
        }))
      : []),
  ];

  if (orConditions.length === 0) return new Map();

  const existing = await prismadb.properties.findMany({
    where: {
      organizationId: orgId,
      archivedAt: null,
      OR: orConditions,
    },
    select: {
      id: true,
      friendlyId: true,
      land_registry_kaek: true,
      address_street: true,
      address_city: true,
      property_name: true,
    },
  });

  const result = new Map<string, DuplicateMatch>();

  for (const prop of existing) {
    // Reconstruct the dedup key the same way the validation engine would.
    // Only emit a key when we have a non-empty value to avoid matching
    // every no-address/no-name property under the same `name:` or `addr:` key.
    let computedKey: string | null = null;
    if (prop.land_registry_kaek?.trim()) {
      computedKey = `kaek:${prop.land_registry_kaek.trim()}`;
    } else if (prop.address_street?.trim()) {
      computedKey = `addr:${prop.address_street.trim().toLowerCase()}|${(prop.address_city ?? "").trim().toLowerCase()}`;
    } else if (prop.property_name.trim()) {
      computedKey = `name:${prop.property_name.trim().toLowerCase()}`;
    }

    if (computedKey && dedupKeys.has(computedKey)) {
      result.set(computedKey, {
        dedupKey: computedKey,
        existingId: prop.id,
        existingFriendlyId: prop.friendlyId,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs cross-batch dedup for a set of contact and property dedup keys.
 *
 * Performs exactly two database round-trips:
 *   1. org-wide contact scan (decrypted in memory)
 *   2. targeted property query by KAEK / address / name
 *
 * Every query is scoped to `orgId` — no cross-tenant lookups.
 */
export async function batchDedupCheck(
  contactDedupKeys: Set<string>,
  propertyDedupKeys: Set<string>,
  orgId: string,
  dek: Buffer,
): Promise<DedupCheckResult> {
  const [contacts, properties] = await Promise.all([
    checkContactDuplicates(contactDedupKeys, orgId, dek),
    checkPropertyDuplicates(propertyDedupKeys, orgId),
  ]);

  return { contacts, properties };
}
