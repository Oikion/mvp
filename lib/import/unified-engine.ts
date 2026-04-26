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
}

export interface ImportEngineOptions {
  /** When false, request rows are skipped even if present. Defaults to true. */
  autoCreateRequests?: boolean;
  /** Import batch ID (from ImportHistory) — written into activity metadata as targetUrl. */
  importBatchId?: string;
  /** Original filename shown in the activity body. */
  importFilename?: string;
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

// ---------------------------------------------------------------------------
// Batch-optimized friendly ID generation
// ---------------------------------------------------------------------------

async function generateBatchFriendlyIds(
  tx: any,
  entityType: EntityType,
  count: number,
  orgId: string,
): Promise<string[]> {
  if (count === 0) return [];
  return generateFriendlyIds(tx, entityType, count, orgId);
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
  let skippedCount = 0;

  if (validatedRows.length === 0) {
    return {
      contacts: [],
      properties: [],
      requests: [],
      linkCounts: { contactProperty: 0, requestProperty: 0, requestContact: 0 },
      errors: [],
      skippedCount: 0,
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

  // Collect data arrays for createMany
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
  const propertiesToCreate: PropertyCreateData[] = [];
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
        const contactUuid = dedupEntry.uuid;
        rowClientUuid.set(row.rowIndex, contactUuid);

        const contactName = String(row.contactRow.contact_name ?? row.contactRow.name ?? "");
        rowClientName.set(row.rowIndex, contactName);

        // Only build create data for the first occurrence of this dedup key
        if (!processedClientKeys.has(row.contactDedupKey)) {
          processedClientKeys.add(row.contactDedupKey);

          try {
            const contactRowData = { ...row.contactRow };

            // Encrypt with DEK (use the raw validated row which already has
            // stripped keys from the validation engine)
            const encrypted = contactImportConfig.encryptWithDek(contactRowData, dek);

            // Get friendly ID from pre-generated batch
            const friendlyId = contactFriendlyIdBatch[contactFidCursor++];
            contactFriendlyIds.set(contactUuid, friendlyId);

            // Build Prisma data using the import config's toPrismaData
            const prismaData = contactImportConfig.toPrismaData(
              contactRowData as any,
              encrypted,
              friendlyId,
              userId,
              orgId,
            );

            // Override with pre-generated UUID
            prismaData.id = contactUuid;

            // Apply assignedTo if provided
            if (assignedTo) {
              prismaData.assigned_to = assignedTo;
            }

            contactsToCreate.push({ uuid: contactUuid, prismaData });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              rowIndex: row.rowIndex,
              entity: "contact",
              error: msg,
            });
            // Remove from dedup map so links won't reference this entity
            rowClientUuid.delete(row.rowIndex);
          }
        }
      }
    }

    // --- PROPERTY ---
    if (row.hasProperty && row.propertyRow && row.propertyDedupKey) {
      const dedupEntry = propertyDedupMap.get(row.propertyDedupKey);
      if (dedupEntry) {
        const propertyUuid = dedupEntry.uuid;
        rowPropertyUuid.set(row.rowIndex, propertyUuid);

        const propertyName = String(row.propertyRow.property_name ?? "");
        rowPropertyName.set(row.rowIndex, propertyName);

        // Only build create data for the first occurrence
        if (!processedPropertyKeys.has(row.propertyDedupKey)) {
          processedPropertyKeys.add(row.propertyDedupKey);

          try {
            const propertyRowData = { ...row.propertyRow };

            // Encrypt
            const encrypted = propertyImportConfig.encryptWithDek(propertyRowData, dek);

            // Get friendly ID
            const friendlyId = propertyFriendlyIdBatch[propertyFidCursor++];
            propertyFriendlyIds.set(propertyUuid, friendlyId);

            // Build Prisma data
            const prismaData = propertyImportConfig.toPrismaData(
              propertyRowData as any,
              encrypted,
              friendlyId,
              userId,
              orgId,
            );

            prismaData.id = propertyUuid;

            if (assignedTo) {
              prismaData.assigned_to = assignedTo;
            }

            propertiesToCreate.push({ uuid: propertyUuid, prismaData });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push({
              rowIndex: row.rowIndex,
              entity: "property",
              error: msg,
            });
            rowPropertyUuid.delete(row.rowIndex);
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

        // The requestRow from validation already has normalized enums and title.
        // If title is missing, generate it now.
        if (!requestRowData.title) {
          const contactName = rowClientName.get(row.rowIndex) ?? null;
          const propertyName = rowPropertyName.get(row.rowIndex) ?? null;
          requestRowData.title = generateRequestTitle(
            requestRowData,
            contactName,
            propertyName,
          );
        }

        // Encrypt
        const encrypted = requestImportConfig.encryptWithDek(requestRowData, dek);

        // Get friendly ID
        const friendlyId = requestFriendlyIdBatch[requestFidCursor++];
        requestFriendlyIds.set(requestUuid, friendlyId);

        // Build Prisma data
        const prismaData = requestImportConfig.toPrismaData(
          requestRowData as any,
          encrypted,
          friendlyId,
          userId,
          orgId,
        );

        prismaData.id = requestUuid;

        if (assignedTo) {
          prismaData.assigned_to = assignedTo;
        }

        rowRequestUuid.set(row.rowIndex, requestUuid);
        requestsToCreate.push({ uuid: requestUuid, prismaData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          rowIndex: row.rowIndex,
          entity: "request",
          error: msg,
        });
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
      // Phase 1 — Contacts
      if (contactsToCreate.length > 0) {
        await tx.contact.createMany({
          data: contactsToCreate.map((c) => c.prismaData),
          skipDuplicates: true,
        });
      }

      // Phase 2 — Properties
      if (propertiesToCreate.length > 0) {
        await tx.properties.createMany({
          data: propertiesToCreate.map((p) => p.prismaData),
          skipDuplicates: true,
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
    { timeout: 15000 },
  );

  // 5. Fire-and-forget activity log — one CREATED entry per entity, after commit
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
  };

  return result;
}

