import type { RequestType } from "@prisma/client";

/** One row in the editable preview table — represents a single request to be created */
export interface PreviewRequest {
  /** Stable client-side key, NOT persisted. Format: `${contactId}::${propertyId}` */
  previewId: string;
  contactId: string;
  contactName: string;
  propertyId: string;
  propertyFriendlyId: string;

  // Editable fields shown in the preview table
  name: string;
  requestType: RequestType;
  budgetMin: number | null;
  budgetMax: number | null;

  // Inferred fields (not shown in table, sent to server action)
  surfaceMin: number | null;
  surfaceMax: number | null;
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  propertyTypes: string[];
  municipality: string | null;
  region: string | null;
  locationDisplayName: string | null;
  conditionPreference: string[];
  furnished: string | null;
  heatingTypes: string[];
  requiresElevator: boolean | null;
  energyClassMin: string | null;
}

export interface GenerateFromContactsInput {
  previews: PreviewRequest[];
}

export interface GenerateFromContactsResultItem {
  previewId: string;
  contactId: string;
  propertyId: string;
  status: "created" | "skipped" | "failed";
  requestId?: string;
  friendlyId?: string;
  error?: string;
}

export interface GenerateFromContactsResult {
  created: number;
  skipped: number;
  failed: number;
  results: GenerateFromContactsResultItem[];
}

/** Eligible contact for step-1 selection list */
export interface EligibleContact {
  id: string;
  displayName: string;
  friendlyId: string;
  category: string[];
  linkedPropertyCount: number;
}
