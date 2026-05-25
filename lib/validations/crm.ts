import { z } from "zod";
import {
  PersonType,
  ClientStatus,
  ClientType,
  LeadSource,
  Language,
} from "@prisma/client";

/**
 * Zod schemas for CRM input validation
 * Prevents mass assignment attacks and ensures data integrity
 *
 * IMPORTANT: All enum schemas use z.nativeEnum() derived from @prisma/client.
 * This ensures validation stays in sync with the database schema automatically.
 * After any Prisma schema change, run `prisma generate` — TypeScript will catch drift.
 */

// Client person types — derived from Prisma PersonType enum
export const personTypeSchema = z.nativeEnum(PersonType);

// Client status values — derived from Prisma ClientStatus enum
export const clientStatusSchema = z.nativeEnum(ClientStatus).optional();

// Client type values — derived from Prisma ClientType enum
export const clientTypeSchema = z.nativeEnum(ClientType).optional();

// Lead source values — derived from Prisma LeadSource enum
export const leadSourceSchema = z.nativeEnum(LeadSource).optional();

/**
 * Base object schema for client fields (no refinements).
 * Used internally so updateClientSchema can call .partial() on a ZodObject.
 */
const clientFieldsSchema = z.object({
  // Basic info
  client_name: z.string().min(1, "Client name is required").max(255),
  primary_email: z.string().email().optional().or(z.literal("")),
  primary_phone: z.string().max(50).optional(),
  secondary_phone: z.string().max(50).optional(),
  secondary_email: z.string().email().optional().or(z.literal("")),
  
  // Type information
  person_type: personTypeSchema.optional(),
  client_type: clientTypeSchema,
  client_status: clientStatusSchema,

  // Personal/Company details
  full_name: z.string().max(255).optional(),
  company_name: z.string().max(255).optional(),
  channels: z.array(z.string()).optional(),
  language: z.nativeEnum(Language).optional(),
  
  // Greek-specific identifiers
  afm: z.string().regex(/^\d{9}$/, "AFM must be exactly 9 digits").optional().or(z.literal("")), // Tax ID
  doy: z.string().max(100).optional(), // Tax office
  id_doc: z.string().max(100).optional(), // ID document
  company_gemi: z.string().max(50).optional(), // Company registry
  
  // Consent
  gdpr_consent: z.boolean().optional(),
  allow_marketing: z.boolean().optional(),
  
  // Source/Status
  lead_source: leadSourceSchema,
  draft_status: z.boolean().optional(),
  
  // Communication
  communication_notes: z.string().optional(),
  
  // Contact details
  office_phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  fax: z.string().max(50).optional(),
  
  // Business details
  company_id: z.string().max(100).optional(),
  vat: z.string().max(50).optional(),
  
  // Billing address
  billing_street: z.string().max(255).optional(),
  billing_postal_code: z.string().regex(/^\d{5}$/, "Greek postal code must be exactly 5 digits").optional().or(z.literal("")),
  billing_city: z.string().max(100).optional(),
  billing_state: z.string().max(100).optional(),
  billing_country: z.string().max(100).optional(),
  
  // Shipping address
  shipping_street: z.string().max(255).optional(),
  shipping_postal_code: z.string().max(20).optional(),
  shipping_city: z.string().max(100).optional(),
  shipping_state: z.string().max(100).optional(),
  shipping_country: z.string().max(100).optional(),
  
  // Description
  description: z.string().optional(),
  
  // Assignment
  assigned_to: z.string().min(1).optional().nullable(),
  member_of: z.string().optional(),
}).strict(); // Reject unknown fields to prevent mass assignment

/**
 * Schema for creating a new client
 * Validates all allowed fields and prevents injection of internal fields
 */
export const createClientSchema = clientFieldsSchema;

/**
 * Schema for updating an existing client
 * All fields optional except id
 */
export const updateClientSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
}).merge(clientFieldsSchema.partial()).strict();

/**
 * Schema for client search/filter parameters
 */
export const clientQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional(),
  status: clientStatusSchema,
  search: z.string().max(100).optional(),
  minimal: z.enum(["true", "false"]).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// =============================================================================
// Form Schemas — shared between creation wizards and edit forms
// =============================================================================

/**
 * Single source of truth for client form field constraints.
 * Both NewClientWizard and EditClientForm import from here.
 * assigned_to uses .nullable() because the DB stores null when no agent was set.
 */
export const clientFormSchema = z.object({
  client_name: z.string().optional(),
  person_type: personTypeSchema.optional(),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),
  secondary_phone: z.string().optional().or(z.literal("")),
  secondary_email: z.string().email().optional().or(z.literal("")),
  channels: z.array(z.string()).optional().default([]),
  language: z.nativeEnum(Language).optional(),
  afm: z.string().optional().or(z.literal("")),
  doy: z.string().optional().or(z.literal("")),
  id_doc: z.string().optional().or(z.literal("")),
  company_gemi: z.string().optional().or(z.literal("")),
  gdpr_consent: z.boolean().optional().default(false),
  allow_marketing: z.boolean().optional().default(false),
  lead_source: leadSourceSchema,
  assigned_to: z.string().optional().nullable(),
  client_type: clientTypeSchema,
  client_status: clientStatusSchema,
  description: z.string().optional().nullable(),
  office_phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
});

export const clientEditFormSchema = clientFormSchema.extend({
  id: z.string().min(1, "Client ID is required"),
  client_name: z.string().min(1, "Client name is required").max(255),
  person_type: personTypeSchema,
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ClientEditFormValues = z.infer<typeof clientEditFormSchema>;
export type ClientQueryParams = z.infer<typeof clientQuerySchema>;

// =============================================================================
// Form Schemas — shared by NewClientWizard and EditClientForm
// =============================================================================

/**
 * Single source of truth for client form field constraints.
 * All fields optional at schema level — the wizard enforces required fields
 * via superRefine with translated messages; edit forms must not block saving
 * when a field was never set (e.g. assigned_to: null in the DB).
 *
 * Import this in BOTH NewClientWizard and EditClientForm.
 * Never redefine these constraints inline.
 */
export const clientFormSchema = z.object({
  // Step 1: Basics
  client_name: z.string().optional(),
  person_type: personTypeSchema.optional(),
  full_name: z.string().optional(),
  company_name: z.string().optional(),
  primary_phone: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),

  // Step 2: Contact
  secondary_phone: z.string().optional().or(z.literal("")),
  secondary_email: z.string().email().optional().or(z.literal("")),
  channels: z.array(z.string()).optional().default([]),
  language: z.nativeEnum(Language).optional(),

  // Step 3: Legal / Greek identifiers
  afm: z.string().optional().or(z.literal("")),
  doy: z.string().optional().or(z.literal("")),
  id_doc: z.string().optional().or(z.literal("")),
  company_gemi: z.string().optional().or(z.literal("")),

  // Step 4: Consent & Source
  gdpr_consent: z.boolean().optional().default(false),
  allow_marketing: z.boolean().optional().default(false),
  lead_source: leadSourceSchema,
  // nullable: DB stores null when no agent is assigned at creation time
  assigned_to: z.string().optional().nullable(),

  // Edit-only fields (not shown in wizard but present in EditClientForm)
  client_type: clientTypeSchema,
  client_status: clientStatusSchema,
  description: z.string().optional().nullable(),
  office_phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
});

/**
 * Edit form version — adds required `id` and enforces client_name and
 * person_type that the edit form always requires.
 */
export const clientEditFormSchema = clientFormSchema.extend({
  id: z.string().min(1, "Client ID is required"),
  client_name: z.string().min(1, "Client name is required").max(255),
  person_type: personTypeSchema,
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
export type ClientEditFormValues = z.infer<typeof clientEditFormSchema>;
