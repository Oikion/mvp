# Data Model

Schema source of truth: `prisma/schema.prisma`. Client singleton: `lib/prisma.ts` (named export `{ prismadb }`).

## Key entities

### Client

CRM contact record. Represents buyers, sellers, renters, investors, or referral partners.

- `organizationId` — tenant isolation
- `client_type` — `BUYER | SELLER | RENTER | INVESTOR | REFERRAL_PARTNER`
- `visibility` — `ItemVisibility` (HIDDEN/PRIVATE/SECURE/PUBLIC), default PRIVATE
- 22 string fields + `communication_notes` JSON are encrypted server-side via `encryptClientForOrg()`
- Related: `Mandate` (one client → many mandates), `Deal`, tags, comments

### Property

MLS listing. Represents real estate for sale or rent.

- `organizationId` — tenant isolation
- `status` — `DRAFT | ACTIVE | UNDER_OFFER | SOLD | ARCHIVED`
- `visibility` (`portalVisibility`) — `ItemVisibility`
- Only `primary_email` and `communication_notes` are encrypted (addresses intentionally unencrypted for searchability)
- Related: `Mandate`, `PropertyImage`, `Deal`, comments

### Mandate

Buyer/renter brief. Links a client's search requirements to potential matching properties.

- `organizationId` — tenant isolation
- `title`, `notes`, `communication_notes` are encrypted
- Related: `Client`, `CrossOrgMatch`, comments

### CalendarEvent

Appointments, viewings, calls. Replaces legacy CalCom integration.

- `organizationId` — tenant isolation
- `title`, `description`, `location`, `attendeeEmail`, `attendeeName`, `notes` are encrypted

### Deal

Transaction record linking a client, property, and optional mandate.

- `organizationId` — tenant isolation
- Tracks deal stage, commission, and key dates

### Users

User profile synced from Clerk via webhooks. **No `organizationId`** — Clerk owns org membership.

- `clerkUserId` — foreign key to Clerk
- Related via `assigned_to` / `created_by` nullable fields on other models
- `onDelete: SetNull` on all user references — records persist when user departs

### OrganizationKey

Per-org Data Encryption Key (DEK) wrapped with the master KEK.

- One row per organization
- Used by `lib/key-management.ts` to fetch and cache the DEK for encryption/decryption

## Relationships overview

```
Client ──────────── Mandate ─────── CrossOrgMatch
  │                    │
  │                  Property
  │                    │
  └──── Deal ──────────┘

Users ──── (assigned_to / created_by on all entities, nullable)
```

## Tenant isolation pattern

Every tenant-scoped model:
1. Has `organizationId String` field
2. Has `@@index([organizationId])`
3. Uses `@@map("plural_snake_case")` for table name

See [Multi-Tenancy](./multi-tenancy.md) for query patterns.

## Schema change workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
pnpm db:migrate --name descriptive_name
# 3. Apply to production
pnpm db:deploy
```

Never use `prisma db push` in production. See `docs/database/setup.md` for full details.

## Enum conventions

- PascalCase type names, UPPER_SNAKE_CASE values
- Add new enum values **at the end only** — mid-enum inserts require non-transactional `ADD VALUE` migrations

## Soft relationships on user departure

When a user leaves an org, `assigned_to` and `created_by` fields become `null` (`onDelete: SetNull`). Records are never deleted. This is managed by `lib/user-departure/handleUserDeparture()`.
