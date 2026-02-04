// @ts-nocheck
// TODO: Fix type errors
/**
 * Export History Tracking Service
 * 
 * Provides functionality to:
 * - Record exports with metadata and data snapshots
 * - Retrieve export history for entities
 * - Detect changes since last export for re-export warnings
 */

import { prismadb } from "@/lib/prisma";
import type { ExportEntityType } from "@prisma/client";
import { getChangeDetectionFields } from "./templates";
import type { ExportTemplateType } from "./templates";

// ============================================
// TYPES
// ============================================

export interface RecordExportParams {
  organizationId: string;
  userId: string;
  entityType: ExportEntityType;
  entityId: string;
  entityIds?: string[];
  exportFormat: string;
  exportTemplate?: string | null;
  destination?: string | null;
  filename: string;
  rowCount?: number;
  /** Current entity data for snapshot */
  entityData?: Record<string, unknown> | Record<string, unknown>[];
  /** Custom fields to track for change detection (overrides template defaults) */
  customChangeFields?: string[];
}

export interface ExportHistoryRecord {
  id: string;
  organizationId: string;
  userId: string;
  entityType: ExportEntityType;
  entityId: string;
  entityIds: string[];
  exportFormat: string;
  exportTemplate: string | null;
  destination: string | null;
  filename: string;
  rowCount: number;
  dataSnapshot: Record<string, unknown> | null;
  changeFields: string[];
  createdAt: Date;
}

export interface ChangedField {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  label?: string;
}

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFields: ChangedField[];
  lastExportDate: Date;
  lastExportFormat: string;
  lastExportDestination: string | null;
}

// ============================================
// DEFAULT CHANGE DETECTION FIELDS
// ============================================

const DEFAULT_CHANGE_FIELDS: Record<ExportEntityType, string[]> = {
  PROPERTY: ["price", "property_status", "square_feet", "bedrooms", "description"],
  CLIENT: ["client_status", "budget_min", "budget_max", "primary_email", "primary_phone"],
  CALENDAR: ["title", "startTime", "endTime", "status"],
  REPORT: [],
  BULK_PROPERTIES: ["price", "property_status"],
  BULK_CLIENTS: ["client_status"],
};

// Field labels for display
const FIELD_LABELS: Record<string, { en: string; el: string }> = {
  price: { en: "Price", el: "Τιμή" },
  property_status: { en: "Status", el: "Κατάσταση" },
  square_feet: { en: "Size", el: "Εμβαδόν" },
  bedrooms: { en: "Bedrooms", el: "Υπνοδωμάτια" },
  description: { en: "Description", el: "Περιγραφή" },
  client_status: { en: "Status", el: "Κατάσταση" },
  budget_min: { en: "Min Budget", el: "Ελάχ. Προϋπολογισμός" },
  budget_max: { en: "Max Budget", el: "Μέγ. Προϋπολογισμός" },
  primary_email: { en: "Email", el: "Email" },
  primary_phone: { en: "Phone", el: "Τηλέφωνο" },
  title: { en: "Title", el: "Τίτλος" },
  startTime: { en: "Start Time", el: "Ώρα Έναρξης" },
  endTime: { en: "End Time", el: "Ώρα Λήξης" },
  status: { en: "Status", el: "Κατάσταση" },
  estimated_rent: { en: "Est. Rent", el: "Εκτ. Ενοίκιο" },
  avg_price: { en: "Avg. Price", el: "Μέση Τιμή" },
  active_listings: { en: "Active Listings", el: "Ενεργές Καταχωρήσεις" },
  sold_listings: { en: "Sold Listings", el: "Πωλημένα" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the fields to track for change detection
 */
export function getConfigurableChangeFields(
  entityType: ExportEntityType,
  template?: string | null
): string[] {
  // If a template is specified, use its change detection fields
  if (template) {
    const templateFields = getChangeDetectionFields(template as ExportTemplateType);
    if (templateFields.length > 0) {
      return templateFields;
    }
  }
  
  // Fall back to default fields for entity type
  return DEFAULT_CHANGE_FIELDS[entityType] || [];
}

/**
 * Create a snapshot of entity data for change detection
 */
export function createDataSnapshot(
  entityData: Record<string, unknown> | Record<string, unknown>[] | undefined,
  changeFields: string[]
): Record<string, unknown> | null {
  if (!entityData || changeFields.length === 0) {
    return null;
  }
  
  // For bulk exports, create snapshot of first entity (representative)
  const data = Array.isArray(entityData) ? entityData[0] : entityData;
  
  if (!data) return null;
  
  const snapshot: Record<string, unknown> = {};
  for (const field of changeFields) {
    if (field in data) {
      snapshot[field] = data[field];
    }
  }
  
  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

/**
 * Compare two values for equality (handles dates, numbers, etc.)
 */
function valuesEqual(oldValue: unknown, newValue: unknown): boolean {
  // Handle null/undefined
  if (oldValue == null && newValue == null) return true;
  if (oldValue == null || newValue == null) return false;
  
  // Handle dates
  if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() === newValue.getTime();
  }
  
  // Handle date strings
  if (typeof oldValue === "string" && typeof newValue === "string") {
    const oldDate = new Date(oldValue);
    const newDate = new Date(newValue);
    if (!isNaN(oldDate.getTime()) && !isNaN(newDate.getTime())) {
      return oldDate.getTime() === newDate.getTime();
    }
  }
  
  // Handle numbers (including string numbers)
  const oldNum = Number(oldValue);
  const newNum = Number(newValue);
  if (!isNaN(oldNum) && !isNaN(newNum)) {
    return oldNum === newNum;
  }
  
  // Direct comparison
  return oldValue === newValue;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Record a new export in the history
 */
export async function recordExport(params: RecordExportParams): Promise<ExportHistoryRecord> {
  const {
    organizationId,
    userId,
    entityType,
    entityId,
    entityIds = [],
    exportFormat,
    exportTemplate,
    destination,
    filename,
    rowCount = 1,
    entityData,
    customChangeFields,
  } = params;
  
  // Determine change detection fields
  const changeFields = customChangeFields || getConfigurableChangeFields(entityType, exportTemplate);
  
  // Create data snapshot
  const dataSnapshot = createDataSnapshot(entityData, changeFields);
  
  // Create the export history record
  const record = await prismadb.exportHistory.create({
    data: {
      organizationId,
      userId,
      entityType,
      entityId,
      entityIds,
      exportFormat,
      exportTemplate,
      destination,
      filename,
      rowCount,
      dataSnapshot,
      changeFields,
    },
  });
  
  return {
    ...record,
    dataSnapshot: record.dataSnapshot as Record<string, unknown> | null,
  };
}

/**
 * Get export history for a specific entity
 */
export async function getEntityExportHistory(
  entityType: ExportEntityType,
  entityId: string,
  options?: {
    limit?: number;
    organizationId?: string;
  }
): Promise<ExportHistoryRecord[]> {
  const { limit = 10, organizationId } = options || {};
  
  const whereClause: Record<string, unknown> = {
    entityType,
    entityId,
  };
  
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }
  
  const records = await prismadb.exportHistory.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  
  return records.map(record => ({
    ...record,
    dataSnapshot: record.dataSnapshot as Record<string, unknown> | null,
  }));
}

/**
 * Get export history with various filters
 */
export async function getExportHistory(options: {
  organizationId: string;
  userId?: string;
  entityType?: ExportEntityType;
  entityId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ records: ExportHistoryRecord[]; total: number }> {
  const { organizationId, userId, entityType, entityId, limit = 50, offset = 0 } = options;
  
  const whereClause: Record<string, unknown> = {
    organizationId,
  };
  
  if (userId) {
    whereClause.userId = userId;
  }
  
  if (entityType) {
    whereClause.entityType = entityType;
  }
  
  if (entityId) {
    whereClause.entityId = entityId;
  }
  
  const [records, total] = await Promise.all([
    prismadb.exportHistory.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prismadb.exportHistory.count({ where: whereClause }),
  ]);
  
  return {
    records: records.map(record => ({
      ...record,
      dataSnapshot: record.dataSnapshot as Record<string, unknown> | null,
    })),
    total,
  };
}

/**
 * Detect changes between the last export and current entity data
 */
export async function detectChanges(
  entityType: ExportEntityType,
  entityId: string,
  currentData: Record<string, unknown>,
  options?: {
    organizationId?: string;
    locale?: "en" | "el";
  }
): Promise<ChangeDetectionResult | null> {
  const { organizationId, locale = "en" } = options || {};
  
  // Get the most recent export for this entity
  const whereClause: Record<string, unknown> = {
    entityType,
    entityId,
    dataSnapshot: { not: null },
  };
  
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }
  
  const lastExport = await prismadb.exportHistory.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
  
  if (!lastExport || !lastExport.dataSnapshot) {
    return null;
  }
  
  const snapshot = lastExport.dataSnapshot as Record<string, unknown>;
  const changeFields = lastExport.changeFields;
  const changedFields: ChangedField[] = [];
  
  // Compare each tracked field
  for (const field of changeFields) {
    const oldValue = snapshot[field];
    const newValue = currentData[field];
    
    if (!valuesEqual(oldValue, newValue)) {
      changedFields.push({
        field,
        oldValue,
        newValue,
        label: FIELD_LABELS[field]?.[locale] || field,
      });
    }
  }
  
  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    lastExportDate: lastExport.createdAt,
    lastExportFormat: lastExport.exportFormat,
    lastExportDestination: lastExport.destination,
  };
}

/**
 * Get the last export for an entity (for re-export functionality)
 */
export async function getLastExport(
  entityType: ExportEntityType,
  entityId: string,
  options?: {
    organizationId?: string;
    destination?: string;
    exportFormat?: string;
  }
): Promise<ExportHistoryRecord | null> {
  const { organizationId, destination, exportFormat } = options || {};
  
  const whereClause: Record<string, unknown> = {
    entityType,
    entityId,
  };
  
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }
  
  if (destination) {
    whereClause.destination = destination;
  }
  
  if (exportFormat) {
    whereClause.exportFormat = exportFormat;
  }
  
  const record = await prismadb.exportHistory.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
  
  if (!record) return null;
  
  return {
    ...record,
    dataSnapshot: record.dataSnapshot as Record<string, unknown> | null,
  };
}

/**
 * Format a change for display
 */
export function formatChange(
  change: ChangedField,
  locale: "en" | "el" = "en"
): string {
  const { label, oldValue, newValue } = change;
  
  // Format currency values
  if (typeof oldValue === "number" || typeof newValue === "number") {
    const oldFormatted = oldValue != null 
      ? `€${Number(oldValue).toLocaleString()}` 
      : (locale === "el" ? "κενό" : "empty");
    const newFormatted = newValue != null 
      ? `€${Number(newValue).toLocaleString()}` 
      : (locale === "el" ? "κενό" : "empty");
    return `${label}: ${oldFormatted} → ${newFormatted}`;
  }
  
  // Format other values
  const oldDisplay = oldValue?.toString() || (locale === "el" ? "κενό" : "empty");
  const newDisplay = newValue?.toString() || (locale === "el" ? "κενό" : "empty");
  
  return `${label}: ${oldDisplay} → ${newDisplay}`;
}
