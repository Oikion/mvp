# ADR-008: Zod-Prisma Validation Sync

**Status:** Accepted
**Date:** 2026-03-15

---

# Zod-Prisma Validation Sync

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Clients, Properties, Mandates (Calendar & Documents deferred)

## Problem

Server-side Zod validation schemas in `lib/validations/` were hand-written with guessed enum values that diverge from the Prisma schema — the single source of truth. This causes:

- HTTP 400 validation failures for valid data (production bug for client creation)
- Type mismatches (`z.string()` for array fields, `z.boolean()` for string fields)
- Missing fields stripped by Zod (e.g., `language`, `visibility`)

## Approach

**`z.nativeEnum()` from `@prisma/client`** — import Prisma-generated enum objects and use `z.nativeEnum()` instead of manual `z.enum([...])`. This makes Prisma the single source of truth with zero duplication. TypeScript compilation catches drift after any `prisma generate`.

## Changes

### `lib/validations/crm.ts`

| Field | Before | After |
|-------|--------|-------|
| `clientStatusSchema` | `z.enum(["LEAD","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST","INACTIVE"])` | `z.nativeEnum(ClientStatus)` |
| `clientTypeSchema` | `z.enum(["BUYER","SELLER","LANDLORD","TENANT","INVESTOR","OTHER"])` | `z.nativeEnum(ClientType)` |
| `leadSourceSchema` | `z.enum(["WEBSITE","REFERRAL","SOCIAL_MEDIA","ADVERTISING","COLD_CALL","WALK_IN","PORTAL","OTHER"])` | `z.nativeEnum(LeadSource)` |
| `personTypeSchema` | `z.enum(["INDIVIDUAL","COMPANY","INVESTOR","BROKER"])` | `z.nativeEnum(PersonType)` |
| `channels` | `z.string().max(255)` | `z.array(z.string()).optional()` |
| `language` | missing | `z.nativeEnum(Language).optional()` |

### `lib/validations/mls.ts`

| Field | Before | After |
|-------|--------|-------|
| All enum schemas | manual `z.enum([...])` | `z.nativeEnum(PropertyType)`, `z.nativeEnum(PropertyStatus)`, etc. |
| `amenities` | `z.string()` | `z.array(z.string()).optional()` |
| `orientation` | `z.string().max(100)` | `z.array(z.string()).optional()` |
| `accessibility` | `z.boolean()` | `z.string().max(255).optional()` |

### `lib/validations/mandates.ts`

| Field | Before | After |
|-------|--------|-------|
| All enum schemas | manual `z.enum([...])` | `z.nativeEnum(TransactionType)`, `z.nativeEnum(MandateStatus)`, etc. |
| `visibility` | missing | `z.nativeEnum(ItemVisibility).optional()` |

## Not in scope

- Properties API route (`app/api/mls/properties/route.ts`) — bypasses Zod via `buildPropertyData`; wiring is a separate task
- Calendar Events & Documents — no existing schemas; separate task
- Frontend wizard schemas — local UX validation, not the security boundary
