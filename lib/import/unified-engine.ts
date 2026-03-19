/**
 * lib/import/unified-engine.ts
 *
 * Unified import engine — processes rows containing Client + Property + Mandate
 * data in a single spreadsheet. Orchestrates: partition -> detect -> create -> link.
 */

import { prismadb } from "@/lib/prisma";
import { generateFriendlyIds, type EntityType } from "@/lib/friendly-id";
import { getOrgDek } from "@/lib/key-management";
import { type ImportError } from "./engine";
import {
  UNIFIED_FIELD_DEFINITIONS,
  stripEntityPrefix,
} from "./unified-field-definitions";
import { generateMandateTitle, generateClientName } from "./name-generator";
import { clientImportConfig } from "./client-import-config";
import { propertyImportConfig } from "./property-import-config";
import { mandateImportConfig } from "./mandate-import-config";
import {
  normalizeClientEnums,
  normalizePropertyEnums,
  normalizeMandateEnums,
} from "./enum-normalizer";
import { clientImportSchema } from "./client-import-schema";
import { propertyImportSchema } from "./property-import-schema";
import { mandateImportSchema } from "./mandate-import-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnifiedImportResult {
  clients: { created: number; reused: number; failed: number };
  properties: { created: number; failed: number };
  mandates: { created: number; failed: number };
  links: { clientProperty: number; mandateClient: number; mandateProperty: number };
  skipped: number;
  errors: ImportError[];
}

// ---------------------------------------------------------------------------
// Field → entity ownership map (built once at module load)
// ---------------------------------------------------------------------------

const fieldEntityMap = new Map<string, "client" | "property" | "mandate">();
for (const def of UNIFIED_FIELD_DEFINITIONS) {
  fieldEntityMap.set(def.key, def.entity);
}

// ---------------------------------------------------------------------------
// Lazy-batch friendly ID pool
// ---------------------------------------------------------------------------

class FriendlyIdPool {
  private ids: string[] = [];
  private cursor = 0;
  constructor(
    private entityType: EntityType,
    private orgId: string,
  ) {}
  async next(): Promise<string> {
    if (this.cursor >= this.ids.length) {
      const batch = await generateFriendlyIds(
        prismadb,
        this.entityType,
        50,
        this.orgId,
      );
      this.ids.push(...batch);
    }
    return this.ids[this.cursor++];
  }
}

// ---------------------------------------------------------------------------
// Client deduplication
// ---------------------------------------------------------------------------

function clientDedupKey(row: Record<string, unknown>): string {
  const phone = String(row.primary_phone ?? "")
    .trim()
    .replace(/\D/g, "");
  const email = String(row.primary_email ?? "").trim().toLowerCase();
  const name = String(row.client_name ?? "").trim().toLowerCase();
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return `name:${name}`;
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
  clientRow: Record<string, unknown>;
  propertyRow: Record<string, unknown>;
  mandateRow: Record<string, unknown>;
} {
  const clientRow: Record<string, unknown> = {};
  const propertyRow: Record<string, unknown> = {};
  const mandateRow: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const entity = fieldEntityMap.get(key);
    if (!entity) continue; // unmapped keys are dropped
    if (entity === "client") clientRow[key] = value;
    else if (entity === "property") propertyRow[key] = value;
    else mandateRow[key] = value;
  }

  return { clientRow, propertyRow, mandateRow };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function executeUnifiedImport(
  rows: Record<string, unknown>[],
  orgId: string,
  userId: string,
): Promise<UnifiedImportResult> {
  const errors: ImportError[] = [];
  const result: UnifiedImportResult = {
    clients: { created: 0, reused: 0, failed: 0 },
    properties: { created: 0, failed: 0 },
    mandates: { created: 0, failed: 0 },
    links: { clientProperty: 0, mandateClient: 0, mandateProperty: 0 },
    skipped: 0,
    errors,
  };

  if (rows.length === 0) return result;

  // Pre-flight: fetch DEK once and create ID pools
  const dek = await getOrgDek(orgId);
  const clientPool = new FriendlyIdPool("Clients", orgId);
  const propertyPool = new FriendlyIdPool("Properties", orgId);
  const mandatePool = new FriendlyIdPool("Mandates", orgId);

  // Dedup map: dedupKey -> { uuid, friendlyId }
  const clientMap = new Map<string, { uuid: string; friendlyId: string }>();

  // Detect whether the file has a client_name column mapped at all
  const fileHasClientNameColumn = rows.some((r) => r.client_name !== undefined);

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for 0-index, +1 for header row

    // ── 1. PARTITION ──────────────────────────────────────────────────────
    const { clientRow, propertyRow, mandateRow: rawMandateRow } = partitionRow(rows[i]);

    // ── 2. DETECT ─────────────────────────────────────────────────────────
    const hasClient = isNonEmpty(clientRow.client_name) ||
      (!fileHasClientNameColumn &&
        (isNonEmpty(clientRow.primary_phone) || isNonEmpty(clientRow.primary_email)));

    const hasProperty = isNonEmpty(propertyRow.property_name);

    // Strip entity prefixes from mandate row so keys match the per-entity schema
    const mandateRow = stripEntityPrefix(rawMandateRow);
    const hasMandate = Object.values(rawMandateRow).some(isNonEmpty);

    // Track UUIDs from each entity creation step
    let clientUuid: string | null = null;
    let clientName: string | null = null;
    let propertyUuid: string | null = null;
    let propertyName: string | null = null;
    let mandateUuid: string | null = null;

    // If nothing to create, skip row
    if (!hasClient && !hasProperty && !hasMandate) {
      result.skipped++;
      continue;
    }

    // ── 3. CLIENT ─────────────────────────────────────────────────────────
    if (hasClient) {
      try {
        // Auto-name when triggered by phone/email without explicit name
        if (!isNonEmpty(clientRow.client_name)) {
          clientRow.client_name = generateClientName(clientRow);
        }

        // Dedup check
        const key = clientDedupKey(clientRow);
        const existing = clientMap.get(key);
        if (existing) {
          clientUuid = existing.uuid;
          clientName = String(clientRow.client_name ?? "");
          result.clients.reused++;
        } else {
          // Strip entity prefixes (e.g. client_description → description)
          const clientRowStripped = stripEntityPrefix(clientRow);

          // Normalize enums
          const normalized = normalizeClientEnums(clientRowStripped);

          // Validate
          const parsed = clientImportSchema.safeParse(normalized);
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              errors.push({
                row: rowNum,
                field: `client.${issue.path.join(".") || "unknown"}`,
                error: issue.message,
                value: String(normalized[issue.path[0] as string] ?? ""),
              });
            }
            result.clients.failed++;
          } else {
            // Encrypt (use stripped keys so field names match encryption config)
            const encrypted = clientImportConfig.encryptWithDek(clientRowStripped, dek);

            // Generate ID and build Prisma data
            const friendlyId = await clientPool.next();
            const prismaData = clientImportConfig.toPrismaData(
              parsed.data,
              encrypted,
              friendlyId,
              userId,
              orgId,
            );

            const record = await (prismadb.clients as any).create({
              data: prismaData,
            });

            clientUuid = record.id;
            clientName = String(clientRow.client_name ?? "");
            clientMap.set(key, { uuid: record.id, friendlyId });
            result.clients.created++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "client", error: msg });
        result.clients.failed++;
        clientUuid = null;
      }
    }

    // ── 4. PROPERTY ───────────────────────────────────────────────────────
    if (hasProperty) {
      try {
        const normalized = normalizePropertyEnums(propertyRow);
        const parsed = propertyImportSchema.safeParse(normalized);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            errors.push({
              row: rowNum,
              field: `property.${issue.path.join(".") || "unknown"}`,
              error: issue.message,
              value: String(normalized[issue.path[0] as string] ?? ""),
            });
          }
          result.properties.failed++;
        } else {
          const encrypted = propertyImportConfig.encryptWithDek(normalized, dek);
          const friendlyId = await propertyPool.next();
          const prismaData = propertyImportConfig.toPrismaData(
            parsed.data,
            encrypted,
            friendlyId,
            userId,
            orgId,
          );

          const record = await (prismadb.properties as any).create({
            data: prismaData,
          });

          propertyUuid = record.id;
          propertyName = String(propertyRow.property_name ?? "");
          result.properties.created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "property", error: msg });
        result.properties.failed++;
        propertyUuid = null;
      }
    }

    // ── 5. MANDATE ────────────────────────────────────────────────────────
    if (hasMandate) {
      try {
        // Budget auto-copy from property price
        if (hasProperty && propertyRow.price != null) {
          if (mandateRow.budget_min == null) mandateRow.budget_min = propertyRow.price;
          if (mandateRow.budget_max == null) mandateRow.budget_max = propertyRow.price;
        }

        // Normalize enums (must happen before title generation for tx_type lookup)
        const normalized = normalizeMandateEnums(mandateRow);

        // Inject auto-generated title BEFORE safeParse
        const title = generateMandateTitle(
          normalized,
          clientName,
          propertyName,
        );
        normalized.title = title;

        // Validate
        const parsed = mandateImportSchema.safeParse(normalized);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            errors.push({
              row: rowNum,
              field: `mandate.${issue.path.join(".") || "unknown"}`,
              error: issue.message,
              value: String(normalized[issue.path[0] as string] ?? ""),
            });
          }
          result.mandates.failed++;
        } else {
          const encrypted = mandateImportConfig.encryptWithDek(normalized, dek);
          const friendlyId = await mandatePool.next();
          const prismaData = mandateImportConfig.toPrismaData(
            parsed.data,
            encrypted,
            friendlyId,
            userId,
            orgId,
          );

          const record = await (prismadb.mandate as any).create({
            data: prismaData,
          });

          mandateUuid = record.id;
          result.mandates.created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "mandate", error: msg });
        result.mandates.failed++;
        mandateUuid = null;
      }
    }

    // ── 6. LINKS ──────────────────────────────────────────────────────────
    // Client <-> Property
    if (clientUuid && propertyUuid) {
      try {
        await (prismadb.client_Properties as any).create({
          data: {
            id: crypto.randomUUID(), // NO @default on this junction table
            clientId: clientUuid,
            propertyId: propertyUuid,
          },
        });
        result.links.clientProperty++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "link.clientProperty", error: msg });
      }
    }

    // Mandate <-> Property
    if (mandateUuid && propertyUuid) {
      try {
        await (prismadb.mandate_Properties as any).create({
          data: {
            mandateId: mandateUuid,
            propertyId: propertyUuid,
          },
        });
        result.links.mandateProperty++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "link.mandateProperty", error: msg });
      }
    }

    // Mandate <-> Client
    if (mandateUuid && clientUuid) {
      try {
        await (prismadb.mandate_Clients as any).create({
          data: {
            mandateId: mandateUuid,
            clientId: clientUuid,
          },
        });
        result.links.mandateClient++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: rowNum, field: "link.mandateClient", error: msg });
      }
    }
  }

  result.errors = errors;
  return result;
}
