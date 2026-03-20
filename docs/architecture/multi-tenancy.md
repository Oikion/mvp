# Multi-Tenancy

Oikion uses a single PostgreSQL database with application-level tenant isolation. Every tenant-scoped record is tagged with `organizationId` (a Clerk organization ID string).

## The rule

Every query on tenant-scoped data must filter by `organizationId`. No exceptions.

```typescript
// Correct
const properties = await prismadb.property.findMany({
  where: { organizationId }
});

// Wrong — cross-tenant data leak
const properties = await prismadb.property.findMany();
```

For single-record lookups, always use `findFirst` with both `id` and `organizationId`:

```typescript
// Safe — cannot fetch another org's record
const client = await prismadb.client.findFirst({
  where: { id: clientId, organizationId }
});
```

Never use `findUnique` with only `id` on a tenant-scoped model.

## Getting the current org ID

In server actions and API routes, obtain `organizationId` from the authenticated session:

```typescript
import { auth } from "@clerk/nextjs/server";

const { orgId: organizationId } = await auth();
if (!organizationId) throw new Error("No active organization");
```

The `organizationId` must always come from auth context, never from user-supplied input.

## Prisma schema pattern

All tenant-scoped models follow this structure:

```prisma
model Property {
  id             String   @id @default(cuid())
  organizationId String
  // ... fields ...
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("properties")
}
```

Required: `organizationId` field, `@@index([organizationId])`, `@@map("plural_snake_case")`.

## Users model exception

The `Users` model has **no `organizationId`** — Clerk manages org membership. To query users within an org:

```typescript
import { clerkClient } from "@clerk/nextjs/server";

const memberships = await clerkClient.organizations.getOrganizationMembershipList({
  organizationId
});
const clerkUserIds = memberships.map(m => m.publicUserData?.userId).filter(Boolean);

const users = await prismadb.users.findMany({
  where: { clerkUserId: { in: clerkUserIds } }
});
```

## Cross-org data sharing

Cross-org sharing is governed by the `ItemVisibility` enum on `Property`, `Client`, and `Mandate`:

| Value | Behavior |
|-------|---------|
| `HIDDEN` | Excluded from all automated systems (matchmaking, analytics, cross-org) |
| `PRIVATE` | Agency-only; participates in intra-org matchmaking |
| `SECURE` | Shared within app (bilateral + Polis cross-org matching) |
| `PUBLIC` | Shared + can appear on public agent profile |

Cross-org match records (`CrossOrgMatch`) are atomically deleted when visibility is downgraded to `HIDDEN` or `PRIVATE`, using a `$transaction` in the visibility update actions.

## Verification

The `/verify` Cursor command includes a tenant isolation scan. Before shipping any new read path, confirm your query has `organizationId` in the `where` clause.
