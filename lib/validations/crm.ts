import { z } from "zod";

/**
 * Zod schemas for CRM input validation
 * Prevents mass assignment attacks and ensures data integrity
 */

// Client person types
export const personTypeSchema = z.enum(["INDIVIDUAL", "COMPANY"]).optional();

// Client status values
export const clientStatusSchema = z.enum([
  "LEAD",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "INACTIVE",
]).optional();

// Client type values  
export const clientTypeSchema = z.enum([
  "BUYER",
  "SELLER",
  "LANDLORD",
  "TENANT",
  "INVESTOR",
  "OTHER",
]).optional();

// Intent values
export const intentSchema = z.enum([
  "BUY",
  "RENT",
  "SELL",
  "LEASE",
]).optional();

// Lead source values
export const leadSourceSchema = z.enum([
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "ADVERTISING",
  "COLD_CALL",
  "WALK_IN",
  "PORTAL",
  "OTHER",
]).optional();

// Financing type values
export const financingTypeSchema = z.enum([
  "CASH",
  "MORTGAGE",
  "BANK_LOAN",
  "OTHER",
]).optional();

/**
 * Schema for creating a new client
 * Validates all allowed fields and prevents injection of internal fields
 */
export const createClientSchema = z.object({
  // Basic info
  client_name: z.string().min(1, "Client name is required").max(255),
  primary_email: z.string().email().optional().or(z.literal("")),
  primary_phone: z.string().max(50).optional(),
  secondary_phone: z.string().max(50).optional(),
  secondary_email: z.string().email().optional().or(z.literal("")),
  
  // Type information
  person_type: personTypeSchema,
  client_type: clientTypeSchema,
  client_status: clientStatusSchema,
  intent: intentSchema,
  
  // Personal/Company details
  full_name: z.string().max(255).optional(),
  company_name: z.string().max(255).optional(),
  channels: z.string().max(255).optional(),
  language: z.string().max(10).optional(),
  
  // Greek-specific identifiers
  afm: z.string().max(20).optional(), // Tax ID
  doy: z.string().max(100).optional(), // Tax office
  id_doc: z.string().max(100).optional(), // ID document
  company_gemi: z.string().max(50).optional(), // Company registry
  
  // Property preferences
  purpose: z.string().max(255).optional(),
  areas_of_interest: z.string().optional(),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
  timeline: z.string().max(100).optional(),
  property_preferences: z.string().optional(),
  
  // Financial
  financing_type: financingTypeSchema,
  preapproval_bank: z.string().max(100).optional(),
  needs_mortgage_help: z.boolean().optional(),
  
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
  billing_postal_code: z.string().max(20).optional(),
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
  assigned_to: z.string().uuid().optional().nullable(),
  member_of: z.string().optional(),
}).strict(); // Reject unknown fields to prevent mass assignment

/**
 * Schema for updating an existing client
 * All fields optional except id
 */
export const updateClientSchema = z.object({
  id: z.string().min(1, "Client ID is required"),
}).merge(createClientSchema.partial()).strict();

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
export type ClientQueryParams = z.infer<typeof clientQuerySchema>;
