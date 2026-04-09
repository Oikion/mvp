import { z } from "zod";
import {
  ContactCategory,
  ContactStatus,
  ContactSource,
  ContactRelationshipType,
  ItemVisibility,
  Language,
} from "@prisma/client";

/**
 * Zod schemas for Contact (v2.0) input validation.
 * Prevents mass assignment attacks and ensures data integrity.
 *
 * All enum schemas use z.nativeEnum() derived from @prisma/client.
 * This ensures validation stays in sync with the database schema automatically.
 * After any Prisma schema change, run `prisma generate` — TypeScript will catch drift.
 */

// ── Enum schemas ──

export const contactCategorySchema = z.nativeEnum(ContactCategory);
export const contactStatusSchema = z.nativeEnum(ContactStatus);
export const contactSourceSchema = z.nativeEnum(ContactSource);
export const contactRelationshipTypeSchema = z.nativeEnum(ContactRelationshipType);
export const contactVisibilitySchema = z.nativeEnum(ItemVisibility);

// ── Address schema (JSON structure) ──

const addressEntrySchema = z.object({
  type: z.enum(["billing", "shipping"]),
  street: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, "Greek postal code must be exactly 5 digits")
    .optional()
    .or(z.literal("")),
  municipality: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});

export const addressesSchema = z.array(addressEntrySchema).optional().nullable();

// ── Base contact fields schema (no refinements) ──

const contactFieldsSchema = z.object({
  // Name
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  displayName: z.string().min(1, "Display name is required").max(255),
  isCompany: z.boolean().optional().default(false),
  companyName: z.string().max(255).optional().nullable(),

  // Classification
  category: z.array(contactCategorySchema).min(1, "At least one category is required"),
  status: contactStatusSchema.optional().default("LEAD"),
  source: contactSourceSchema.optional().nullable(),
  visibility: contactVisibilitySchema.optional().default("PRIVATE"),

  // Contact info
  email: z.string().email().optional().nullable().or(z.literal("")),
  secondaryEmail: z.string().email().optional().nullable().or(z.literal("")),
  primaryPhone: z.string().max(50).optional().nullable(),
  secondaryPhone: z.string().max(50).optional().nullable(),
  officePhone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  viber: z.string().max(50).optional().nullable(),

  // Greek business fields
  taxId: z
    .string()
    .regex(/^\d{9}$/, "ΑΦΜ must be exactly 9 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  doy: z.string().max(100).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  companyGemi: z.string().max(50).optional().nullable(),
  companyId: z.string().max(100).optional().nullable(),
  idDocument: z.string().max(100).optional().nullable(),

  // Address
  addresses: addressesSchema,

  // CRM fields
  assignedAgentId: z.string().min(1).optional().nullable(),
  languagePreference: z.nativeEnum(Language).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  leadScore: z.number().int().min(1).max(5).optional().nullable(),
  doNotContact: z.boolean().optional().default(false),
  gdprConsentGiven: z.boolean().optional().default(false),
  gdprConsentDate: z.coerce.date().optional().nullable(),
  allowMarketing: z.boolean().optional().default(false),
  lastContactedAt: z.coerce.date().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  referredById: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  communicationNotes: z.string().optional().nullable(),
}).strict();

/**
 * Schema for creating a new contact.
 * Validates all allowed fields and prevents injection of internal fields.
 * At least one contact method (email or phone) is recommended.
 */
export const createContactSchema = contactFieldsSchema.refine(
  (data) => {
    // Company contacts must have a companyName
    if (data.isCompany && !data.companyName) {
      return false;
    }
    return true;
  },
  {
    message: "Company contacts require a company name",
    path: ["companyName"],
  }
);

/**
 * Schema for updating an existing contact.
 * All fields optional except id.
 */
export const updateContactSchema = z
  .object({
    id: z.string().min(1, "Contact ID is required"),
  })
  .merge(contactFieldsSchema.partial())
  .strict();

/**
 * Schema for contact search/filter parameters.
 */
export const contactQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  status: contactStatusSchema.optional(),
  category: contactCategorySchema.optional(),
  search: z.string().max(100).optional(),
  minimal: z.enum(["true", "false"]).optional(),
  includeDeleted: z.enum(["true", "false"]).optional(),
});

// ── Form schema (shared by create wizard + edit form) ──

export const contactFormSchema = z.object({
  // Name
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  displayName: z.string().optional(),
  isCompany: z.boolean().optional().default(false),
  companyName: z.string().optional().nullable(),

  // Classification
  category: z.array(contactCategorySchema).optional().default([]),
  status: contactStatusSchema.optional(),
  source: contactSourceSchema.optional().nullable(),
  visibility: contactVisibilitySchema.optional(),

  // Contact info
  email: z.string().email().optional().nullable().or(z.literal("")),
  secondaryEmail: z.string().email().optional().nullable().or(z.literal("")),
  primaryPhone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable().or(z.literal("")),
  officePhone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  viber: z.string().optional().nullable(),

  // Greek business fields
  taxId: z.string().optional().nullable().or(z.literal("")),
  doy: z.string().optional().nullable().or(z.literal("")),
  vatNumber: z.string().optional().nullable(),
  companyGemi: z.string().optional().nullable().or(z.literal("")),
  companyId: z.string().optional().nullable(),
  idDocument: z.string().optional().nullable().or(z.literal("")),

  // Address
  addresses: addressesSchema,

  // CRM
  assignedAgentId: z.string().optional().nullable(),
  languagePreference: z.nativeEnum(Language).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  leadScore: z.number().int().min(1).max(5).optional().nullable(),
  doNotContact: z.boolean().optional().default(false),
  gdprConsentGiven: z.boolean().optional().default(false),
  allowMarketing: z.boolean().optional().default(false),
  referredById: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  communicationNotes: z.string().optional().nullable(),
});

export const contactEditFormSchema = contactFormSchema.extend({
  id: z.string().min(1, "Contact ID is required"),
  displayName: z.string().min(1, "Display name is required").max(255),
  category: z.array(contactCategorySchema).min(1, "At least one category is required"),
});

// ── ContactRelationship schema ──

export const createContactRelationshipSchema = z.object({
  contactIdA: z.string().min(1),
  contactIdB: z.string().min(1),
  relationshipType: contactRelationshipTypeSchema,
  notes: z.string().max(500).optional().nullable(),
}).refine((data) => data.contactIdA !== data.contactIdB, {
  message: "A contact cannot have a relationship with itself",
  path: ["contactIdB"],
});

// ── Exported types ──

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export type ContactEditFormValues = z.infer<typeof contactEditFormSchema>;
export type ContactQueryParams = z.infer<typeof contactQuerySchema>;
export type AddressEntry = z.infer<typeof addressEntrySchema>;
