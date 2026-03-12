import type { DataOwnershipMode, DepartureReason } from "@prisma/client";

// ─── Policy History ──────────────────────────────────────

export interface PolicyEra {
  mode: DataOwnershipMode;
  from: string; // ISO date
  to: string | null; // null = current era
}

// ─── Migration Results ───────────────────────────────────

export interface MigratedEntity {
  id: string;
  title: string;
}

export interface MigratedEntities {
  properties: MigratedEntity[];
  clients: { id: string; name: string }[];
  mandates: MigratedEntity[];
}

export type CancelledDeals = { id: string; title: string }[];

export interface EntityCounts {
  properties: number;
  clients: number;
  mandates: number;
  deals: number;
}

export interface MigrationResult {
  migratedEntities: MigratedEntities;
  cancelledDeals: CancelledDeals;
  entityCounts: EntityCounts;
}

// ─── Policy Lookup ───────────────────────────────────────

export interface PolicyForEntity {
  mode: DataOwnershipMode;
  era: PolicyEra;
}

// ─── Migration Context ───────────────────────────────────

export interface MigrationContext {
  userId: string;
  sourceOrgId: string;
  personalOrgId: string;
  currentMode: DataOwnershipMode;
  policyHistory: PolicyEra[] | null;
}
