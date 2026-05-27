/**
 * lib/import/unified-engine.ts
 *
 * Unified import engine — processes validated rows containing Contact + Property
 * + Request data. The batch engine wraps all writes in a single $transaction
 * using createMany for performance and atomicity.
 *
 * Primary export: executeBatchImport()
 */

import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds, type EntityType } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";
import { logEntityCreated } from "@/lib/activity-logger";
import {
  UNIFIED_FIELD_DEFINITIONS,
  stripEntityPrefix,
} from "./unified-field-definitions";
import { generateRequestTitle, generateClientName } from "./name-generator";
import { contactImportConfig } from "./contact-import-config";
import { propertyImportConfig } from "./property-import-config";
import { requestImportConfig } from "./request-import-config";
import { contactImportSchema } from "./contact-import-schema";
import { propertyImportSchema } from "./property-import-schema";
import { requestImportSchema } from "./request-import-schema";
import { batchDedupCheck, type DuplicateMatch } from "./dedup-checker";
import type { ValidatedRow } from "./validation-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchImportResult {
  contacts: Array<{ uuid: string; friendlyId: string }>;
  properties: Array<{ uuid: string; friendlyId: string }>;
  requests: Array<{ uuid: string; friendlyId: string }>;
  linkCounts: {
    contactProperty: number;
    requestProperty: number;
    requestContact: number;
  };
  errors: Array<{ rowIndex: number; entity: string; error: string }>;
  skippedCount: number;
  /** Entities matched in the DB and either skipped or overwritten. */
  matchedCount: number;
  /** Details of each row skipped because an existing entity was found. */
  skippedDuplicates: Array<DuplicateMatch & { entity: "contact" | "property" }>;
}

export type DuplicateHandling = "skip" | "overwrite" | "create_anyway";

export interface ImportEngineOptions {
  /** When false, request rows are skipped even if present. Defaults to true. */
  autoCreateRequests?: boolean;
  /** Import batch ID (from ImportHistory) — written into activity metadata as targetUrl. */
  importBatchId?: string;
  /** Original filename shown in the activity body. */
  importFilename?: string;
  /**
   * How to handle rows whose dedup key matches an existing entity in the org:
   *  "skip"         — skip the row, record in skippedDuplicates (default)
   *  "overwrite"    — update the existing entity with the new field values
   *  "create_anyway"— bypass all DB dedup checks, always create new entities
   */
  duplicateHandling?: DuplicateHandling;
}


// ---------------------------------------------------------------------------
// Field -> entity ownership map (built once at module load)
// ---------------------------------------------------------------------------

const fieldEntityMap = new Map<string, "contact" | "property" | "request">();
for (const def of UNIFIED_FIELD_DEFINITIONS) {
  fieldEntityMap.set(def.key, def.entity);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonEmpty(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "";
}

function partitionRow(
  row: Record<string, unknown>,
): {
  contactRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  requestRow: Record<string, unknown>;
} {
  const contactRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const requestRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue;
    if (entity === "contact") contactRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else requestRow[key] = value;
  }

  return { contactRow, propertyRow, requestRow };
}

function contactDedupKeyFromRow(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "")
    .trim()
    .replace(/\D/g, "");
  const email = String(row.contact_primary_email ?? "").trim().toLowerCase();
  const name = String(row.contact_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
}

function propertyDedupKeyFromRow(row: Record<string, unknown>): string {
  const kaek = String(row.land_registry_kaek ?? "").trim();
  if (kaek) return `kaek:${kaek}`;
  const street = String(row.address_street ?? "").trim().toLowerCase();
  const city = String(row.address_city ?? "").trim().toLowerCase();
  if (street) return `addr:${street}|${city}`;
  return `name:${String(row.property_name ?? "").trim().toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Main batch import
// ---------------------------------------------------------------------------

export async function executeBatchImport(
  validatedRows: ValidatedRow[],
  orgId: string,
  userId: string,
  assignedTo?: string | null,
  options?: ImportEngineOptions,
): Promise<BatchImportResult> {
  const errors: BatchImportResult["errors"] = [];
  const skippedDuplicates: BatchImportResult["skippedDuplicates"] = [];
  let skippedCount = 0;
  let matchedCount = 0;

  const duplicateHandling: DuplicateHandling = options?.duplicateHandling ?? "skip";

  if (validatedRows.length === 0) {
    return {
      contacts: [],
      properties: [],
      requests: [],
      linkCounts: { contactProperty: 0, requestProperty: 0, requestContact: 0 },
      errors: [],
      skippedCount: 0,
      matchedCount: 0,
      skippedDuplicates: [],
    };
  }

  // 1. Fetch org DEK once
  const dek = await getOrgDek(orgId);

  // 2. Pre-process: determine unique entities, assign UUIDs, build dedup maps.
  //    Track per-row entity UUID mappings for junction links.

  // --- Contact dedup ---
  // Key: contactDedupKey -> { uuid, rowIndices }
  const contactDedupMap = new Map<string, { uuid: string; rowIndex: number }>();
  // Per-row: rowIndex -> contactUuid (for linking)
  const rowClientUuid = new Map<number, string>();
  // Per-row: rowIndex -> contactName (for request title)
  const rowClientName = new Map<number, string>();

  // --- Property dedup ---
  const propertyDedupMap = new Map<string, { uuid: string; rowIndex: number }>();
  const rowPropertyUuid = new Map<number, string>();
  const rowPropertyName = new Map<number, string>();

  // --- Request (no dedup, 1 per row) ---
  const rowRequestUuid = new Map<number, string>();

  // Collect data arrays for createMany / update
  interface ContactCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }
  interface PropertyCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }
  interface RequestCreateData {
    uuid: string;
    prismaData: Record<string, unknown>;
  }

  const contactsToCreate: ContactCreateData[] = [];
  const contactsToUpdate: Array<{ existingId: string; prismaData: Record<string, unknown> }> = [];
  const propertiesToCreate: PropertyCreateData[] = [];
  const propertiesToUpdate: Array<{ existingId: string; prismaData: Record<string, unknown> }> = [];
  const requestsToCreate: RequestCreateData[] = [];

  // Track friendly IDs by UUID for result assembly
  const contactFriendlyIds = new Map<string, string>();
  const propertyFriendlyIds = new Map<string, string>();
  const requestFriendlyIds = new Map<string, string>();

  // Count unique entities needed for batch friendly ID generation
  let uniqueContactCount = 0;
  let uniquePropertyCount = 0;
  let requestCount = 0;

  // First pass: identify unique entities and count
  for (const row of validatedRows) {
    if (!row.hasContact && !row.hasProperty && !row.hasRequest) {
      skippedCount++;
      continue;
    }

    if (row.hasContact && row.contactDedupKey) {
      if (!contactDedupMap.has(row.contactDedupKey)) {
        contactDedupMap.set(row.contactDedupKey, {
          uuid: crypto.randomUUID(),
          rowIndex: row.rowIndex,
        });
        uniqueContactCount++;
      }
    }

    if (row.hasProperty && row.propertyDedupKey) {
      if (!propertyDedupMap.has(row.propertyDedupKey)) {
        propertyDedupMap.set(row.propertyDedupKey, {
          uuid: crypto.randomUUID(),
          rowIndex: row.rowIndex,
        });
        uniquePropertyCount++;
      }
    }

    if (row.hasRequest) {
      requestCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // 2.5 — Cross-batch DB dedup check (between passes)
  //
  // Skip entirely when duplicateHandling === "create_anyway" to preserve
  // the original behaviour of always inserting new entities.
  // ---------------------------------------------------------------------------

  let dbContactMatches = new Map<string, DuplicateMatch>();
  let dbPropertyMatches = new Map<string, DuplicateMatch>();

  if (duplicateHandling !== "create_anyway" && (contactDedupMap.size > 0 || propertyDedupMap.size > 0)) {
    const dedupResult = await batchDedupCheck(
      new Set(contactDedupMap.keys()),
      new Set(propertyDedupMap.keys()),
      orgId,
      dek,
    );
    dbContactMatches = dedupResult.contacts;
    dbPropertyMatches = dedupResult.properties;

    // Adjust unique counts to exclude entities we won't create (skip) or
    // entities that reuse an existing ID rather than consuming a new one (overwrite).
    // Both modes avoid allocating a new friendly ID for the matched entity.
    if (duplicateHandling === "skip" || duplicateHandling === "overwrite") {
      uniqueContactCount -= dbContactMatches.size;
      uniquePropertyCount -= dbPropertyMatches.size;
    }
    // Ensure counts don't go negative (safety guard)
    uniqueContactCount = Math.max(0, uniqueContactCount);
    uniquePropertyCount = Math.max(0, uniquePropertyCount);
  }

  // Pre-generate all friendly IDs in batch (outside transaction, uses raw SQL)
  const contactFriendlyIdBatch =
    uniqueContactCount > 0
      ? await generateFriendlyIds(prismadb, "Contact", uniqueContactCount, orgId)
      : [];
  const propertyFriendlyIdBatch =
    uniquePropertyCount > 0
      ? await generateFriendlyIds(prismadb, "Properties", uniquePropertyCount, orgId)
      : [];
  const requestFriendlyIdBatch =
    requestCount > 0
      ? await generateFriendlyIds(prismadb, "Request", requestCount, orgId)
      : [];

  let contactFidCursor = 0;
  let propertyFidCursor = 0;
  let requestFidCursor = 0;

  // Second pass: build Prisma data arrays
  // Track which dedup keys have already been processed (for first-occurrence assembly)
  const processedClientKeys = new Set<string>();
  const processedPropertyKeys = new Set<string>();

  for (const row of validatedRows) {
    if (!row.hasContact && !row.hasProperty && !row.hasRequest) {
      continue; // already counted as skipped
    }

    // --- CONTACT ---
    if (row.hasContact && row.contactRow && row.contactDedupKey) {
      const dedupEntry = contactDedupMap.get(row.contactDedupKey);
      if (dedupEntry) {
        const dbMatch = dbContactMatches.get(row.contactDedupKey);
        const contactUuid = dbMatch ? dbMatch.existingId : dedupEntry.uuid;
        rowClientUuid.set(row.rowIndex, contactUuid);

        const contactName = String(row.contactRow.contact_name ?? row.contactRow.name ?? "");
        rowClientName.set(row.rowIndex, contactName);

        // Only build create/update data for the first occurrence of this dedup key
        if (!processedClientKeys.has(row.contactDedupKey)) {
          processedClientKeys.add(row.contactDedupKey);

          if (dbMatch) {
            // Existing entity found in DB
            matchedCount++;

            if (duplicateHandling === "skip") {
              skippedDuplicates.push({ ...dbMatch, entity: "contact" });
              // rowClientUuid already set to existingId — links will reference it
            } else if (duplicateHandling === "overwrite") {
              // Build updated prismaData (same path as create, but without id/friendlyId/createdBy)
              try {
                const contactRowData = { ...row.contactRow };
                const encrypted = contactImportConfig.encryptWithDek(contactRowData, dek);
                const prismaData = contactImportConfig.toPrismaData(
                  contactRowData as any,
                  encrypted,
                  dbMatch.existingFriendlyId ?? "",
                  userId,
                  orgId,
                );
                // Don't overwrite id, friendlyId, createdBy on an existing entity
                delete prismaData.id;
                delete prismaData.friendlyId;
                delete prismaData.createdBy;
                if (assignedTo) prismaData.assigned_to = assignedTo;
                contactsToUpdate.push({ existingId: dbMatch.existingId, prismaData });
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push({ rowIndex: row.rowIndex, entity: "contact", error: msg });
              }
            }
            // "create_anyway" is handled by the outer guard — dbMatch will always be empty
          } else {
            // No existing entity — create new
            try {
              const contactRowData = { ...row.contactRow };
              const encrypted = contactImportConfig.encryptWithDek(contactRowData, dek);
              const friendlyId = contactFriendlyIdBatch[contactFidCursor++];
              contactFriendlyIds.set(contactUuid, friendlyId);

              const prismaData = contactImportConfig.toPrismaData(
                contactRowData as any,
                encrypted,
                friendlyId,
                userId,
                orgId,
              );
              prismaData.id = contactUuid;
              if (assignedTo) prismaData.assigned_to = assignedTo;
              contactsToCreate.push({ uuid: contactUuid, prismaData });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              errors.push({ rowIndex: row.rowIndex, entity: "contact", error: msg });
              rowClientUuid.delete(row.rowIndex);
            }
          }
        }
      }
    }

    // --- PROPERTY ---
    if (row.hasProperty && row.propertyRow && row.propertyDedupKey) {
      const dedupEntry = propertyDedupMap.get(row.propertyDedupKey);
      if (dedupEntry) {
        const dbMatch = dbPropertyMatches.get(row.propertyDedupKey);
        const propertyUuid = dbMatch ? dbMatch.existingId : dedupEntry.uuid;
        rowPropertyUuid.set(row.rowIndex, propertyUuid);

        const propertyName = String(row.propertyRow.property_name ?? "");
        rowPropertyName.set(row.rowIndex, propertyName);

        if (!processedPropertyKeys.has(row.propertyDedupKey)) {
          processedPropertyKeys.add(row.propertyDedupKey);

          if (dbMatch) {
            matchedCount++;

            if (duplicateHandling === "skip") {
              skippedDuplicates.push({ ...dbMatch, entity: "property" });
            } else if (duplicateHandling === "overwrite") {
              try {
                const propertyRowData = { ...row.propertyRow };
                const encrypted = propertyImportConfig.encryptWithDek(propertyRowData, dek);
                const prismaData = propertyImportConfig.toPrismaData(
                  propertyRowData as any,
                  encrypted,
                  dbMatch.existingFriendlyId ?? "",
                  userId,
                  orgId,
                );
                delete prismaData.id;
                delete prismaData.friendlyId;
                delete prismaData.createdBy;
                if (assignedTo) prismaData.assigned_to = assignedTo;
                propertiesToUpdate.push({ existingId: dbMatch.existingId, prismaData });
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push({ rowIndex: row.rowIndex, entity: "property", error: msg });
              }
            }
          } else {
            try {
              const propertyRowData = { ...row.propertyRow };
              const encrypted = propertyImportConfig.encryptWithDek(propertyRowData, dek);
              const friendlyId = propertyFriendlyIdBatch[propertyFidCursor++];
              propertyFriendlyIds.set(propertyUuid, friendlyId);

              const prismaData = propertyImportConfig.toPrismaData(
                propertyRowData as any,
                encrypted,
                friendlyId,
                userId,
                orgId,
              );
              prismaData.id = propertyUuid;
              if (assignedTo) prismaData.assigned_to = assignedTo;
              propertiesToCreate.push({ uuid: propertyUuid, prismaData });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              errors.push({ rowIndex: row.rowIndex, entity: "property", error: msg });
              rowPropertyUuid.delete(row.rowIndex);
            }
          }
        }
      }
    }

    // --- REQUEST ---
    if (row.hasRequest && row.requestRow && options?.autoCreateRequests !== false) {
      try {
        const requestUuid = crypto.randomUUID();
        const requestRowData = { ...row.requestRow };

        // Budget auto-copy from property price (already done in validation
        // engine for requestRow, but re-check for safety)
        if (row.hasProperty && row.propertyRow?.price != null) {
          if (requestRowData.budget_min == null)
            requestRowData.budget_min = row.propertyRow.price;
          if (requestRowData.budget_max == null)
            requestRowData.budget_max = row.propertyRow.price;
        }

        // The requestRow from validation already has normalized enums and name.
        // If name is missing, generate it now.
        if (!requestRowData.name) {
          const contactName = rowClientName.get(row.rowIndex) ?? null;
          const propertyName = rowPropertyName.get(row.rowIndex) ?? null;
          requestRowData.name = generateRequestTitle(
            requestRowData,
            contactName,
            propertyName,
          );
        }

        const encrypted = requestImportConfig.encryptWithDek(requestRowData, dek);
        const friendlyId = requestFriendlyIdBatch[requestFidCursor++];
        requestFriendlyIds.set(requestUuid, friendlyId);

        const prismaData = requestImportConfig.toPrismaData(
          requestRowData as any,
          encrypted,
          friendlyId,
          userId,
          orgId,
        );
        prismaData.id = requestUuid;
        if (assignedTo) prismaData.assigned_to = assignedTo;

        rowRequestUuid.set(row.rowIndex, requestUuid);
        requestsToCreate.push({ uuid: requestUuid, prismaData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ rowIndex: row.rowIndex, entity: "request", error: msg });
      }
    }
  }

  // 3. Build junction link arrays
  interface ContactPropertyLink {
    id: string;
    contactId: string;
    propertyId: string;
    organizationId: string;
  }
  interface RequestPropertyLink {
    organizationId: string;
    requestId: string;
    propertyId: string;
  }
  interface RequestContactLink {
    id: string;
    requestId: string;
    contactId: string;
    organizationId: string;
  }

  const contactPropertyLinks: ContactPropertyLink[] = [];
  const requestPropertyLinks: RequestPropertyLink[] = [];
  const requestContactLinks: RequestContactLink[] = [];

  // Dedup junction links (a deduped contact may link to the same property from multiple rows)
  const cpLinkSet = new Set<string>();
  const rpLinkSet = new Set<string>();
  const rcLinkSet = new Set<string>();

  for (const row of validatedRows) {
    const contactUuid = rowClientUuid.get(row.rowIndex);
    const propertyUuid = rowPropertyUuid.get(row.rowIndex);
    const requestUuid = rowRequestUuid.get(row.rowIndex);

    if (contactUuid && propertyUuid) {
      const key = `${contactUuid}:${propertyUuid}`;
      if (!cpLinkSet.has(key)) {
        cpLinkSet.add(key);
        contactPropertyLinks.push({
          id: crypto.randomUUID(),
          contactId: contactUuid,
          propertyId: propertyUuid,
          organizationId: orgId,
        });
      }
    }

    if (requestUuid && propertyUuid) {
      const key = `${requestUuid}:${propertyUuid}`;
      if (!rpLinkSet.has(key)) {
        rpLinkSet.add(key);
        requestPropertyLinks.push({
          organizationId: orgId,
          requestId: requestUuid,
          propertyId: propertyUuid,
        });
      }
    }

    if (requestUuid && contactUuid) {
      const key = `${requestUuid}:${contactUuid}`;
      if (!rcLinkSet.has(key)) {
        rcLinkSet.add(key);
        requestContactLinks.push({
          id: crypto.randomUUID(),
          requestId: requestUuid,
          contactId: contactUuid,
          organizationId: orgId,
        });
      }
    }
  }

  // 4. Execute everything inside a single transaction
  await prismadb.$transaction(
    async (tx: any) => {
      // Phase 1 — Create Contacts
      if (contactsToCreate.length > 0) {
        await tx.contact.createMany({
          data: contactsToCreate.map((c) => c.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 1b — Overwrite Contacts (individual updates for per-row encrypted payloads)
      for (const { existingId, prismaData } of contactsToUpdate) {
        await tx.contact.update({
          where: { id: existingId, organizationId: orgId },
          data: prismaData,
        });
      }

      // Phase 2 — Create Properties
      if (propertiesToCreate.length > 0) {
        await tx.properties.createMany({
          data: propertiesToCreate.map((p) => p.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 2b — Overwrite Properties
      for (const { existingId, prismaData } of propertiesToUpdate) {
        await tx.properties.update({
          where: { id: existingId, organizationId: orgId },
          data: prismaData,
        });
      }

      // Phase 3 — Requests
      if (requestsToCreate.length > 0) {
        await tx.request.createMany({
          data: requestsToCreate.map((m) => m.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 4 — Junction Links
      if (contactPropertyLinks.length > 0) {
        await tx.contactProperty.createMany({
          data: contactPropertyLinks,
          skipDuplicates: true,
        });
      }

      if (requestPropertyLinks.length > 0) {
        await tx.propertyRequestMatch.createMany({
          data: requestPropertyLinks,
          skipDuplicates: true,
        });
      }

      if (requestContactLinks.length > 0) {
        await tx.requestContact.createMany({
          data: requestContactLinks,
          skipDuplicates: true,
        });
      }
    },
    // 30s: matches deleteImportBatch; accommodates overwrite mode which issues
    // individual UPDATE calls in addition to bulk createMany.
    { timeout: 30000 },
  );

  // 5. Fire-and-forget activity log — one CREATED entry per new entity, after commit
  const importBatchId = options?.importBatchId;
  const importFilename = options?.importFilename;
  void Promise.allSettled([
    ...contactsToCreate.map((c) =>
      logEntityCreated({
        organizationId: orgId,
        parentType: "CONTACT",
        parentId: c.uuid,
        createdByUserId: userId,
        source: "import",
        importBatchId,
        importFilename,
      }),
    ),
    ...propertiesToCreate.map((p) =>
      logEntityCreated({
        organizationId: orgId,
        parentType: "PROPERTY",
        parentId: p.uuid,
        createdByUserId: userId,
        source: "import",
        importBatchId,
        importFilename,
      }),
    ),
    ...requestsToCreate.map((r) =>
      logEntityCreated({
        organizationId: orgId,
        parentType: "REQUEST",
        parentId: r.uuid,
        createdByUserId: userId,
        source: "import",
        importBatchId,
        importFilename,
      }),
    ),
  ]);

  // 6. Assemble typed result
  const result: BatchImportResult = {
    contacts: contactsToCreate.map((c) => ({
      uuid: c.uuid,
      friendlyId: contactFriendlyIds.get(c.uuid) ?? "",
    })),
    properties: propertiesToCreate.map((p) => ({
      uuid: p.uuid,
      friendlyId: propertyFriendlyIds.get(p.uuid) ?? "",
    })),
    requests: requestsToCreate.map((m) => ({
      uuid: m.uuid,
      friendlyId: requestFriendlyIds.get(m.uuid) ?? "",
    })),
    linkCounts: {
      contactProperty: contactPropertyLinks.length,
      requestProperty: requestPropertyLinks.length,
      requestContact: requestContactLinks.length,
    },
    errors,
    skippedCount,
    matchedCount,
    skippedDuplicates,
  };

  return result;
}
