# Mandate Entity Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the entity linking triangle so Mandates link bidirectionally to both Properties and Clients (M:N), matching the existing Client ↔ Property pattern.

**Architecture:** Two new explicit junction tables (`Mandate_Properties`, `Mandate_Clients`) following the `Client_Properties` pattern. The existing `Mandate.clientId` FK is migrated to the junction table then removed. All three detail pages (Mandate, Property, Client) get bidirectional link/unlink UI using the shared `LinkEntityDialog` and `LinkedEntitiesPanel` components.

**Tech Stack:** Prisma (schema + migration), Next.js API routes, SWR mutations, React (shadcn/ui components)

**Design doc:** `docs/plans/2026-03-06-mandate-entity-linking-design.md`

---

## Task 1: Prisma Schema — Add Junction Tables

**Files:**
- Modify: `prisma/schema.prisma` (lines 281, 719, 1560-1565)

**Step 1: Add `Mandate_Properties` junction table**

After the `Client_Properties` model (line 209), add:

```prisma
model Mandate_Properties {
  id         String     @id @default(uuid())
  createdAt  DateTime   @default(now())
  mandateId  String
  propertyId String
  Mandate    Mandate    @relation(fields: [mandateId], references: [id], onDelete: Cascade)
  Properties Properties @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([mandateId, propertyId])
  @@index([mandateId])
  @@index([propertyId])
}
```

**Step 2: Add `Mandate_Clients` junction table**

After `Mandate_Properties`, add:

```prisma
model Mandate_Clients {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  mandateId String
  clientId  String
  Mandate   Mandate  @relation(fields: [mandateId], references: [id], onDelete: Cascade)
  Clients   Clients  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([mandateId, clientId])
  @@index([mandateId])
  @@index([clientId])
}
```

**Step 3: Add relation fields to existing models**

In the `Properties` model (around line 719), add:
```prisma
  Mandate_Properties              Mandate_Properties[]
```

In the `Clients` model (around line 281), replace:
```prisma
  Mandate                          Mandate[]
```
with:
```prisma
  Mandate_Clients                  Mandate_Clients[]
```

In the `Mandate` model (lines 1560-1565), replace:
```prisma
  clientId            String?
  client_linked_at    DateTime?
  ...
  client              Clients?          @relation(fields: [clientId], references: [id], onDelete: SetNull)
```
with:
```prisma
  Mandate_Properties  Mandate_Properties[]
  Mandate_Clients     Mandate_Clients[]
```

Remove `clientId` and `client_linked_at` fields and the `client` relation. Also remove the `@@index([clientId])` line.

**Step 4: Generate and run migration**

```bash
pnpm db:migrate
```

Name it: `add_mandate_linking_junction_tables`

The migration SQL should:
1. Create both junction tables
2. Migrate existing `clientId` data: `INSERT INTO "Mandate_Clients" (id, "createdAt", "mandateId", "clientId") SELECT gen_random_uuid(), COALESCE(client_linked_at, NOW()), id, "clientId" FROM "Mandate" WHERE "clientId" IS NOT NULL`
3. Drop `clientId` and `client_linked_at` columns from `Mandate`

**Step 5: Regenerate Prisma client**

```bash
pnpm prisma generate
```

**Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(db): add Mandate_Properties and Mandate_Clients junction tables"
```

---

## Task 2: API Route — Mandate Link Entities

**Files:**
- Create: `app/api/mandates/link-entities/route.ts`

This route handles all mandate linking operations, mirroring `app/api/crm/clients/link-properties/route.ts`.

**Step 1: Create the route file**

```typescript
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

/**
 * POST /api/mandates/link-entities
 * Link properties or clients to a mandate
 * Body: { mandateId, propertyIds?: string[], clientIds?: string[] }
 */
export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { mandateId, propertyIds, clientIds } = body;

    if (!mandateId) {
      return NextResponse.json({ error: "mandateId is required" }, { status: 400 });
    }

    // Verify mandate belongs to org
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
      select: { id: true },
    });
    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    const results: any[] = [];

    if (propertyIds?.length) {
      // Verify all properties belong to org
      const properties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
        select: { id: true },
      });
      const validPropertyIds = properties.map((p) => p.id);

      for (const propertyId of validPropertyIds) {
        const link = await prismadb.mandate_Properties.upsert({
          where: { mandateId_propertyId: { mandateId, propertyId } },
          create: { mandateId, propertyId },
          update: {},
        });
        results.push(link);
      }
    }

    if (clientIds?.length) {
      // Verify all clients belong to org
      const clients = await prismadb.clients.findMany({
        where: { id: { in: clientIds }, organizationId },
        select: { id: true },
      });
      const validClientIds = clients.map((c) => c.id);

      for (const clientId of validClientIds) {
        const link = await prismadb.mandate_Clients.upsert({
          where: { mandateId_clientId: { mandateId, clientId } },
          create: { mandateId, clientId },
          update: {},
        });
        results.push(link);
      }
    }

    return NextResponse.json({ links: results });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_POST]", error);
    return NextResponse.json({ error: "Failed to link entities" }, { status: 500 });
  }
}

/**
 * DELETE /api/mandates/link-entities
 * Unlink properties or clients from a mandate
 * Query: ?mandateId=X&propertyIds=a,b or ?mandateId=X&clientIds=a,b
 */
export async function DELETE(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { searchParams } = new URL(req.url);
    const mandateId = searchParams.get("mandateId");
    const propertyIdsParam = searchParams.get("propertyIds");
    const clientIdsParam = searchParams.get("clientIds");

    if (!mandateId) {
      return NextResponse.json({ error: "mandateId is required" }, { status: 400 });
    }

    // Verify mandate belongs to org
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
      select: { id: true },
    });
    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    if (propertyIdsParam) {
      const propertyIds = propertyIdsParam.split(",");
      await prismadb.mandate_Properties.deleteMany({
        where: { mandateId, propertyId: { in: propertyIds } },
      });
    }

    if (clientIdsParam) {
      const clientIds = clientIdsParam.split(",");
      await prismadb.mandate_Clients.deleteMany({
        where: { mandateId, clientId: { in: clientIds } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_DELETE]", error);
    return NextResponse.json({ error: "Failed to unlink entities" }, { status: 500 });
  }
}

/**
 * PUT /api/mandates/link-entities
 * Reverse direction: link mandates to a property or client
 * Body: { propertyId, mandateIds: string[] } or { clientId, mandateIds: string[] }
 */
export async function PUT(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { propertyId, clientId, mandateIds } = body;

    if (!mandateIds?.length) {
      return NextResponse.json({ error: "mandateIds is required" }, { status: 400 });
    }

    // Verify all mandates belong to org
    const mandates = await prismadb.mandate.findMany({
      where: { id: { in: mandateIds }, organizationId },
      select: { id: true },
    });
    const validMandateIds = mandates.map((m) => m.id);

    const results: any[] = [];

    if (propertyId) {
      // Verify property belongs to org
      const property = await prismadb.properties.findFirst({
        where: { id: propertyId, organizationId },
        select: { id: true },
      });
      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      for (const mandateId of validMandateIds) {
        const link = await prismadb.mandate_Properties.upsert({
          where: { mandateId_propertyId: { mandateId, propertyId } },
          create: { mandateId, propertyId },
          update: {},
        });
        results.push(link);
      }
    }

    if (clientId) {
      // Verify client belongs to org
      const client = await prismadb.clients.findFirst({
        where: { id: clientId, organizationId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      for (const mandateId of validMandateIds) {
        const link = await prismadb.mandate_Clients.upsert({
          where: { mandateId_clientId: { mandateId, clientId } },
          create: { mandateId, clientId },
          update: {},
        });
        results.push(link);
      }
    }

    return NextResponse.json({ links: results });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_PUT]", error);
    return NextResponse.json({ error: "Failed to link mandates" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mandates/link-entities/
git commit -m "feat(api): add mandate link-entities route for M:N linking"
```

---

## Task 3: API Route — Mandate Linked Entities Fetch

**Files:**
- Create: `app/api/mandates/[mandateId]/linked/route.ts`

This mirrors `app/api/mls/properties/[propertyId]/linked/route.ts` and `app/api/crm/clients/[clientId]/linked/route.ts`.

**Step 1: Create the route file**

```typescript
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/mandates/[mandateId]/linked
 * Fetch linked properties and clients for a mandate
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ mandateId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json({ error: "Mandate ID is required" }, { status: 400 });
    }

    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
      select: { id: true, title: true },
    });

    if (!mandate) {
      return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
    }

    // Fetch linked properties
    const linkedPropertiesRaw = await prismadb.mandate_Properties.findMany({
      where: { mandateId },
      include: {
        Properties: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            property_type: true,
            property_status: true,
            address_street: true,
            address_city: true,
            area: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            Users_Properties_assigned_toToUsers: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const properties = linkedPropertiesRaw.map((lp) => ({
      ...lp.Properties,
      assigned_to_user: lp.Properties.Users_Properties_assigned_toToUsers,
    }));

    // Fetch linked clients
    const linkedClientsRaw = await prismadb.mandate_Clients.findMany({
      where: { mandateId },
      include: {
        Clients: {
          select: {
            id: true,
            friendlyId: true,
            client_name: true,
            client_type: true,
            client_status: true,
            primary_email: true,
            primary_phone: true,
            intent: true,
            Users_Clients_assigned_toToUsers: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const clients = linkedClientsRaw.map((lc) => ({
      ...lc.Clients,
      assigned_to_user: lc.Clients.Users_Clients_assigned_toToUsers,
    }));

    // Serialize Decimal fields
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj && typeof obj === "object" && "toNumber" in obj && typeof obj.toNumber === "function") return obj.toNumber();
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(serializePrismaObject);
      if (typeof obj === "object") {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = serializePrismaObject(value);
        }
        return serialized;
      }
      return obj;
    };

    return NextResponse.json({
      mandate: serializePrismaObject(mandate),
      properties: serializePrismaObject(properties),
      clients: serializePrismaObject(clients),
      counts: {
        properties: properties.length,
        clients: clients.length,
      },
    });
  } catch (error) {
    console.error("[MANDATE_LINKED_GET]", error);
    return NextResponse.json({ error: "Failed to fetch linked entities" }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add app/api/mandates/\[mandateId\]/linked/
git commit -m "feat(api): add mandate linked entities fetch endpoint"
```

---

## Task 4: Update Property & Client Linked Endpoints to Include Mandates

**Files:**
- Modify: `app/api/mls/properties/[propertyId]/linked/route.ts`
- Modify: `app/api/crm/clients/[clientId]/linked/route.ts`

**Step 1: Property linked endpoint — add mandate fetch**

In `app/api/mls/properties/[propertyId]/linked/route.ts`, after the `linkedEventsRaw` query (around line 145), add:

```typescript
    // Fetch linked mandates
    const linkedMandatesRaw = await prismadb.mandate_Properties.findMany({
      where: { propertyId },
      include: {
        Mandate: {
          select: {
            id: true,
            friendlyId: true,
            title: true,
            transaction_type: true,
            status: true,
            urgency: true,
            budget_min: true,
            budget_max: true,
            organizationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to same org
    const mandates = linkedMandatesRaw
      .filter((lm) => lm.Mandate.organizationId === property!.organizationId)
      .map((lm) => lm.Mandate);
```

Then update the response JSON (around line 187) to include mandates:

```typescript
    return NextResponse.json({
      property: serializePrismaObject(property),
      clients: serializePrismaObject(linkedClients.map((lc) => lc.client)),
      mandates: serializePrismaObject(mandates),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        clients: linkedClients.length,
        mandates: mandates.length,
        events: linkedEvents.length,
        upcomingEvents: upcomingEvents.length,
      },
    });
```

**Step 2: Client linked endpoint — add mandate fetch**

In `app/api/crm/clients/[clientId]/linked/route.ts`, after the `linkedEventsRaw` query (around line 123), add:

```typescript
    // Fetch linked mandates
    const linkedMandatesRaw = await prismadb.mandate_Clients.findMany({
      where: { clientId },
      include: {
        Mandate: {
          select: {
            id: true,
            friendlyId: true,
            title: true,
            transaction_type: true,
            status: true,
            urgency: true,
            budget_min: true,
            budget_max: true,
            organizationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mandates = linkedMandatesRaw
      .filter((lm) => lm.Mandate.organizationId === organizationId)
      .map((lm) => lm.Mandate);
```

Then update the response JSON (around line 165) to include mandates:

```typescript
    return NextResponse.json({
      client: serializePrismaObject(client),
      properties: serializePrismaObject(linkedProperties.map((lp) => lp.property)),
      mandates: serializePrismaObject(mandates),
      events: {
        upcoming: serializePrismaObject(upcomingEvents),
        past: serializePrismaObject(pastEvents),
        total: linkedEvents.length,
      },
      counts: {
        properties: linkedProperties.length,
        mandates: mandates.length,
        events: linkedEvents.length,
        upcomingEvents: upcomingEvents.length,
      },
    });
```

**Step 3: Commit**

```bash
git add app/api/mls/properties/\[propertyId\]/linked/ app/api/crm/clients/\[clientId\]/linked/
git commit -m "feat(api): include linked mandates in property and client linked endpoints"
```

---

## Task 5: SWR Hooks — useMandateLinked + Link Mutations

**Files:**
- Create: `hooks/swr/useMandateLinked.ts`
- Modify: `hooks/swr/useLinkMutations.ts`
- Modify: `hooks/swr/usePropertyLinked.ts` (types only)
- Modify: `hooks/swr/useClientLinked.ts` (types only)

**Step 1: Create `useMandateLinked.ts`**

Follow the exact pattern of `usePropertyLinked.ts`:

```typescript
import useSWR from "swr";

interface LinkedProperty {
  id: string;
  friendlyId: string;
  property_name: string;
  property_type?: string;
  property_status?: string;
  address_street?: string;
  address_city?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  assigned_to_user?: { id: string; name: string | null } | null;
}

interface LinkedClient {
  id: string;
  friendlyId: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  intent?: string;
  assigned_to_user?: { id: string; name: string | null } | null;
}

interface MandateLinkedData {
  mandate?: { id: string; title: string };
  properties: LinkedProperty[];
  clients: LinkedClient[];
  counts: { properties: number; clients: number };
}

interface UseMandateLinkedOptions {
  enabled?: boolean;
}

export function useMandateLinked(
  mandateId: string | undefined,
  options: UseMandateLinkedOptions = {}
) {
  const { enabled = true } = options;
  const key = enabled && mandateId ? `/api/mandates/${mandateId}/linked` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<MandateLinkedData>(key);

  return {
    linkedData: data ?? null,
    properties: data?.properties ?? [],
    clients: data?.clients ?? [],
    counts: data?.counts ?? { properties: 0, clients: 0 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function getMandateLinkedKey(mandateId: string): string {
  return `/api/mandates/${mandateId}/linked`;
}
```

**Step 2: Add mandate link mutations to `useLinkMutations.ts`**

Add these new fetchers after the existing ones (after line 90):

```typescript
// ============================================================
// Mandate Link Fetchers
// ============================================================

async function linkPropertiesToMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; propertyIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to link properties");
  return res.json();
}

async function unlinkPropertyFromMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; propertyId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text() || "Failed to unlink property");
  return res.json();
}

async function linkClientsToMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; clientIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to link clients");
  return res.json();
}

async function unlinkClientFromMandateFetcher(
  url: string,
  { arg }: { arg: { mandateId: string; clientId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&clientIds=${arg.clientId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text() || "Failed to unlink client");
  return res.json();
}

async function linkMandatesToPropertyFetcher(
  url: string,
  { arg }: { arg: { propertyId: string; mandateIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to link mandates");
  return res.json();
}

async function unlinkMandateFromPropertyFetcher(
  url: string,
  { arg }: { arg: { propertyId: string; mandateId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&propertyIds=${arg.propertyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text() || "Failed to unlink mandate");
  return res.json();
}

async function linkMandatesToClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; mandateIds: string[] } }
): Promise<{ links: any[] }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to link mandates");
  return res.json();
}

async function unlinkMandateFromClientFetcher(
  url: string,
  { arg }: { arg: { clientId: string; mandateId: string } }
): Promise<UnlinkResponse> {
  const res = await fetch(
    `${url}?mandateId=${arg.mandateId}&clientIds=${arg.clientId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await res.text() || "Failed to unlink mandate");
  return res.json();
}
```

Add this import at the top:
```typescript
import { getMandateLinkedKey } from "./useMandateLinked";
```

Then add these hooks after the existing ones (after line 210):

```typescript
// ============================================================
// Mandate ↔ Property Hooks
// ============================================================

export function useLinkPropertiesToMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkPropertiesToMandateFetcher,
    { onSuccess: () => { globalMutate(getMandateLinkedKey(mandateId)); } }
  );
  const linkProperties = async (propertyIds: string[]) => trigger({ mandateId, propertyIds });
  return { linkProperties, isLinking: isMutating, error };
}

export function useUnlinkPropertyFromMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkPropertyFromMandateFetcher,
    { onSuccess: () => { globalMutate(getMandateLinkedKey(mandateId)); } }
  );
  const unlinkProperty = async (propertyId: string) => trigger({ mandateId, propertyId });
  return { unlinkProperty, isUnlinking: isMutating, error };
}

// ============================================================
// Mandate ↔ Client Hooks
// ============================================================

export function useLinkClientsToMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkClientsToMandateFetcher,
    { onSuccess: () => { globalMutate(getMandateLinkedKey(mandateId)); } }
  );
  const linkClients = async (clientIds: string[]) => trigger({ mandateId, clientIds });
  return { linkClients, isLinking: isMutating, error };
}

export function useUnlinkClientFromMandate(mandateId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkClientFromMandateFetcher,
    { onSuccess: () => { globalMutate(getMandateLinkedKey(mandateId)); } }
  );
  const unlinkClient = async (clientId: string) => trigger({ mandateId, clientId });
  return { unlinkClient, isUnlinking: isMutating, error };
}

// ============================================================
// Reverse: Property/Client → Mandate Hooks
// ============================================================

export function useLinkMandatesToProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkMandatesToPropertyFetcher,
    { onSuccess: () => { globalMutate(getPropertyLinkedKey(propertyId)); } }
  );
  const linkMandates = async (mandateIds: string[]) => trigger({ propertyId, mandateIds });
  return { linkMandates, isLinking: isMutating, error };
}

export function useUnlinkMandateFromProperty(propertyId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkMandateFromPropertyFetcher,
    { onSuccess: () => { globalMutate(getPropertyLinkedKey(propertyId)); } }
  );
  const unlinkMandate = async (mandateId: string) => trigger({ propertyId, mandateId });
  return { unlinkMandate, isUnlinking: isMutating, error };
}

export function useLinkMandatesToClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    linkMandatesToClientFetcher,
    { onSuccess: () => { globalMutate(getClientLinkedKey(clientId)); } }
  );
  const linkMandates = async (mandateIds: string[]) => trigger({ clientId, mandateIds });
  return { linkMandates, isLinking: isMutating, error };
}

export function useUnlinkMandateFromClient(clientId: string) {
  const { mutate: globalMutate } = useSWRConfig();
  const { trigger, isMutating, error } = useSWRMutation(
    "/api/mandates/link-entities",
    unlinkMandateFromClientFetcher,
    { onSuccess: () => { globalMutate(getClientLinkedKey(clientId)); } }
  );
  const unlinkMandate = async (mandateId: string) => trigger({ clientId, mandateId });
  return { unlinkMandate, isUnlinking: isMutating, error };
}
```

**Step 3: Update `usePropertyLinked.ts` types**

Add `LinkedMandate` interface and include mandates in `PropertyLinkedData`:

```typescript
interface LinkedMandate {
  id: string;
  friendlyId: string;
  title: string;
  transaction_type?: string;
  status?: string;
  urgency?: string;
  budget_min?: number;
  budget_max?: number;
}

interface PropertyLinkedData {
  property?: { id: string; property_name: string; organizationId: string };
  clients: LinkedClient[];
  mandates: LinkedMandate[];
  events: { upcoming: LinkedEvent[]; past: LinkedEvent[]; total: number };
  counts: { clients: number; mandates: number; events: number; upcomingEvents: number };
}
```

Add `mandates` to the return:
```typescript
  return {
    ...existing,
    mandates: data?.mandates ?? [],
  };
```

**Step 4: Update `useClientLinked.ts` types**

Same `LinkedMandate` interface. Add to `ClientLinkedData`:

```typescript
interface ClientLinkedData {
  client?: { id: string; client_name: string };
  properties: LinkedProperty[];
  mandates: LinkedMandate[];
  events: { upcoming: LinkedEvent[]; past: LinkedEvent[]; total: number };
  counts: { properties: number; mandates: number; events: number; upcomingEvents: number };
}
```

Add `mandates` to the return:
```typescript
  return {
    ...existing,
    mandates: data?.mandates ?? [],
  };
```

**Step 5: Commit**

```bash
git add hooks/swr/
git commit -m "feat(hooks): add useMandateLinked and mandate link mutation hooks"
```

---

## Task 6: Entity Search — Add Mandate Type

**Files:**
- Modify: `lib/search/entity-search.ts` (add mandate search)
- Modify: `hooks/swr/useUnifiedEntitySearch.ts` (add "mandate" to EntityType)

**Step 1: Add mandate to EntityType in `lib/search/entity-search.ts`**

Change line 23:
```typescript
export type EntityType = "client" | "property" | "document" | "event" | "mandate";
```

Add a mandate search function (follow the pattern of the existing client/property search functions in this file). It should:
- Query `prismadb.mandate.findMany` filtered by `organizationId`
- Search `title` field (after decryption, or search by `friendlyId`)
- Return results with: `value: id`, `label: title`, `type: "mandate"`, `metadata: { subtitle: transactionType + budgetRange, status, urgency }`

Note: Since mandate `title` is encrypted, you cannot do a Prisma `contains` query on it. Instead:
- Fetch recent mandates (limit 100) and decrypt titles
- Filter client-side by query match on decrypted title or friendlyId
- This matches how encrypted client names are searched in the existing code

**Step 2: Add "mandate" to EntityType in `hooks/swr/useUnifiedEntitySearch.ts`**

Change line 21:
```typescript
export type EntityType = "client" | "property" | "document" | "event" | "mandate";
```

Add a `useMandateSearch` export following the `useClientSearch` pattern.

**Step 3: Commit**

```bash
git add lib/search/entity-search.ts hooks/swr/useUnifiedEntitySearch.ts
git commit -m "feat(search): add mandate to unified entity search"
```

---

## Task 7: UI — Extend LinkEntityDialog for Mandates

**Files:**
- Modify: `components/linking/LinkEntityDialog.tsx`

**Step 1: Add mandate support to LinkEntityDialog**

Update the `entityType` prop to accept `"mandate"`:
```typescript
entityType: "property" | "client" | "mandate";
```

Update `sourceType` to accept `"mandate"`:
```typescript
sourceType: "client" | "property" | "mandate";
```

Add mandate icon and translations (line 71):
```typescript
import { Building2, User, Search, Loader2, FileText } from "lucide-react";

const iconMap = { property: Building2, client: User, mandate: FileText };
const Icon = iconMap[entityType];
```

Update `searchType` mapping (line 81):
```typescript
const searchType: UnifiedEntityType = entityType;
```

Update default title/description for mandate type:
```typescript
const defaultTitle = entityType === "property"
  ? t("dialogs.linkProperties")
  : entityType === "mandate"
  ? t("dialogs.linkMandates")
  : t("dialogs.linkClients");
```

**Step 2: Commit**

```bash
git add components/linking/LinkEntityDialog.tsx
git commit -m "feat(ui): add mandate support to LinkEntityDialog"
```

---

## Task 8: UI — Extend LinkedEntitiesPanel for Mandates

**Files:**
- Modify: `components/linking/LinkedEntitiesPanel.tsx`

**Step 1: Add MandateCard component and mandate type support**

Add a `LinkedMandate` interface (after line 67):
```typescript
interface LinkedMandate {
  id: string;
  friendlyId: string;
  title: string;
  transaction_type?: string;
  status?: string;
  urgency?: string;
  budget_min?: number;
  budget_max?: number;
}
```

Update `LinkedEntitiesPanelProps`:
```typescript
type: "properties" | "clients" | "events" | "mandates";
entities: LinkedProperty[] | LinkedClient[] | LinkedEvent[] | LinkedMandate[];
```

Add `MandateCard` component (follow `PropertyCard` pattern):
```typescript
function MandateCard({
  mandate,
  onUnlink,
}: {
  mandate: LinkedMandate;
  onUnlink?: () => void;
}) {
  const router = useRouter();

  const budgetLabel = mandate.budget_min || mandate.budget_max
    ? `€${(mandate.budget_min ?? 0).toLocaleString()} - €${(mandate.budget_max ?? 0).toLocaleString()}`
    : null;

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
      onClick={() => router.push(`/app/mandates/${mandate.friendlyId}`)}
    >
      {onUnlink && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onUnlink(); }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{mandate.title}</h4>
          {budgetLabel && (
            <p className="text-xs text-muted-foreground truncate">{budgetLabel}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {mandate.transaction_type && (
              <Badge variant="outline" className="text-[10px] h-5">
                {mandate.transaction_type}
              </Badge>
            )}
            {mandate.status && (
              <Badge
                variant={mandate.status === "ACTIVE" ? "default" : "secondary"}
                className="text-[10px] h-5"
              >
                {mandate.status}
              </Badge>
            )}
            {mandate.urgency && (
              <Badge
                variant={mandate.urgency === "HIGH" || mandate.urgency === "CRITICAL" ? "destructive" : "secondary"}
                className="text-[10px] h-5"
              >
                {mandate.urgency}
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
```

Add `FileText` to the lucide-react import.

Update `iconMap`, `titleMap`, `defaultEmptyMap` to include mandates:
```typescript
const iconMap = { properties: Building2, clients: User, events: Calendar, mandates: FileText };
const titleMap = { properties: "Linked Properties", clients: "Linked Clients", events: "Calendar Events", mandates: "Linked Mandates" };
const defaultEmptyMap = { properties: "No linked properties yet", clients: "No linked clients yet", events: "No calendar events yet", mandates: "No linked mandates yet" };
```

Add mandate rendering in the entity list:
```typescript
{type === "mandates" &&
  (entities as LinkedMandate[]).map((mandate) => (
    <MandateCard
      key={mandate.id}
      mandate={mandate}
      onUnlink={onUnlinkEntity ? () => onUnlinkEntity(mandate.id) : undefined}
    />
  ))}
```

**Step 2: Commit**

```bash
git add components/linking/LinkedEntitiesPanel.tsx
git commit -m "feat(ui): add mandate support to LinkedEntitiesPanel"
```

---

## Task 9: UI — Update MandateView to Use Linking Panels

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx`

**Step 1: Replace bespoke client link card with LinkedEntitiesPanel**

Remove:
- The `useClients` import and usage (lines 232-234)
- The raw fetch calls for link/unlink client (lines 250-298)
- The entire bespoke "Client Link" Card (lines 767-843)
- The Popover/Command client picker (lines 873-924)

Add imports:
```typescript
import { useMandateLinked } from "@/hooks/swr/useMandateLinked";
import { useLinkPropertiesToMandate, useUnlinkPropertyFromMandate, useLinkClientsToMandate, useUnlinkClientFromMandate } from "@/hooks/swr/useLinkMutations";
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel";
import { LinkEntityDialog } from "@/components/linking/LinkEntityDialog";
```

Add hooks:
```typescript
const { properties: linkedProperties, clients: linkedClients, isLoading: isLoadingLinked } = useMandateLinked(mandate.id);
const { linkProperties, isLinking: isLinkingProperties } = useLinkPropertiesToMandate(mandate.id);
const { unlinkProperty, isUnlinking: isUnlinkingProperties } = useUnlinkPropertyFromMandate(mandate.id);
const { linkClients, isLinking: isLinkingClients } = useLinkClientsToMandate(mandate.id);
const { unlinkClient, isUnlinking: isUnlinkingClients } = useUnlinkClientFromMandate(mandate.id);

const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);
const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
```

Replace the client link Card in the sidebar with:
```tsx
{/* Linked Clients */}
<LinkedEntitiesPanel
  type="clients"
  entities={linkedClients}
  isLoading={isLoadingLinked || isLinkingClients || isUnlinkingClients}
  onLinkEntity={() => setLinkClientDialogOpen(true)}
  onUnlinkEntity={(clientId) => unlinkClient(clientId)}
  emptyMessage="No clients linked yet"
/>

{/* Linked Properties */}
<LinkedEntitiesPanel
  type="properties"
  entities={linkedProperties}
  isLoading={isLoadingLinked || isLinkingProperties || isUnlinkingProperties}
  onLinkEntity={() => setLinkPropertyDialogOpen(true)}
  onUnlinkEntity={(propertyId) => unlinkProperty(propertyId)}
  emptyMessage="No properties linked yet"
/>
```

Add the dialogs (at the end of the component return, before the closing fragment):
```tsx
<LinkEntityDialog
  open={linkClientDialogOpen}
  onOpenChange={setLinkClientDialogOpen}
  entityType="client"
  sourceId={mandate.id}
  sourceType="mandate"
  alreadyLinkedIds={linkedClients.map((c) => c.id)}
  onLink={linkClients}
/>

<LinkEntityDialog
  open={linkPropertyDialogOpen}
  onOpenChange={setLinkPropertyDialogOpen}
  entityType="property"
  sourceId={mandate.id}
  sourceType="mandate"
  alreadyLinkedIds={linkedProperties.map((p) => p.id)}
  onLink={linkProperties}
/>
```

**Step 2: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mandates/
git commit -m "feat(mandates): replace bespoke client link with LinkedEntitiesPanel for clients and properties"
```

---

## Task 10: UI — Add Linked Mandates to PropertyView

**Files:**
- Modify: `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx`

**Step 1: Add mandate linking to PropertyView**

Add imports:
```typescript
import { useLinkMandatesToProperty, useUnlinkMandateFromProperty } from "@/hooks/swr/useLinkMutations";
```

Add hooks (the `usePropertyLinked` hook already exists — just destructure `mandates` from it):
```typescript
const { mandates: linkedMandates } = usePropertyLinked(property.id);
const { linkMandates, isLinking: isLinkingMandates } = useLinkMandatesToProperty(property.id);
const { unlinkMandate, isUnlinking: isUnlinkingMandates } = useUnlinkMandateFromProperty(property.id);
const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
```

Add a `LinkedEntitiesPanel` for mandates in the linked entities grid (after the existing clients panel, around line 372):
```tsx
<LinkedEntitiesPanel
  type="mandates"
  entities={linkedMandates}
  isLoading={isLoadingLinked || isLinkingMandates || isUnlinkingMandates}
  onLinkEntity={() => setLinkMandateDialogOpen(true)}
  onUnlinkEntity={(mandateId) => unlinkMandate(mandateId)}
  showAddButton={!isReadOnly}
  emptyMessage="No mandates linked to this property yet."
/>
```

Add the dialog:
```tsx
<LinkEntityDialog
  open={linkMandateDialogOpen}
  onOpenChange={setLinkMandateDialogOpen}
  entityType="mandate"
  sourceId={property.id}
  sourceType="property"
  alreadyLinkedIds={linkedMandates.map((m) => m.id)}
  onLink={linkMandates}
/>
```

**Step 2: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mls/properties/
git commit -m "feat(mls): add linked mandates panel to PropertyView"
```

---

## Task 11: UI — Add Linked Mandates to ClientView

**Files:**
- Modify: `app/[locale]/app/(routes)/crm/clients/[slug]/components/ClientView.tsx`

**Step 1: Add mandate linking to ClientView**

Same pattern as PropertyView. Add imports:
```typescript
import { useLinkMandatesToClient, useUnlinkMandateFromClient } from "@/hooks/swr/useLinkMutations";
```

Add hooks (destructure `mandates` from `useClientLinked`):
```typescript
const { mandates: linkedMandates } = useClientLinked(client.id);
const { linkMandates, isLinking: isLinkingMandates } = useLinkMandatesToClient(client.id);
const { unlinkMandate, isUnlinking: isUnlinkingMandates } = useUnlinkMandateFromClient(client.id);
const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
```

Add `LinkedEntitiesPanel` for mandates in the linked entities grid (after the existing properties panel, around line 260):
```tsx
<LinkedEntitiesPanel
  type="mandates"
  entities={linkedMandates}
  isLoading={isLoadingLinked || isLinkingMandates || isUnlinkingMandates}
  onLinkEntity={() => setLinkMandateDialogOpen(true)}
  onUnlinkEntity={(mandateId) => unlinkMandate(mandateId)}
  showAddButton={!isReadOnly}
  emptyMessage="No mandates linked to this client yet."
/>
```

Add the dialog:
```tsx
<LinkEntityDialog
  open={linkMandateDialogOpen}
  onOpenChange={setLinkMandateDialogOpen}
  entityType="mandate"
  sourceId={client.id}
  sourceType="client"
  alreadyLinkedIds={linkedMandates.map((m) => m.id)}
  onLink={linkMandates}
/>
```

**Step 2: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/crm/clients/
git commit -m "feat(crm): add linked mandates panel to ClientView"
```

---

## Task 12: Remove Old Mandate Link-Client API Route

**Files:**
- Delete: `app/api/mandates/[mandateId]/link-client/route.ts`

**Step 1: Delete the old route**

This route is now replaced by `/api/mandates/link-entities`. Verify no other code imports or calls it.

Search for references:
```bash
grep -r "link-client" app/ --include="*.ts" --include="*.tsx" -l
```

If `MandateView.tsx` was the only consumer (confirmed in Task 9), and it's been updated, delete the file.

**Step 2: Commit**

```bash
git rm app/api/mandates/\[mandateId\]/link-client/route.ts
git commit -m "refactor: remove deprecated mandate link-client route (replaced by link-entities)"
```

---

## Task 13: Update Mandate GET Endpoints

**Files:**
- Modify: `app/api/mandates/[mandateId]/route.ts` (single mandate GET)
- Modify: `app/api/mandates/route.ts` (list GET)
- Modify: `actions/mandates/get-mandate.ts`
- Modify: `actions/mandates/get-mandates.ts`

**Step 1: Update single mandate GET to include linked counts**

In the GET handler for `/api/mandates/[mandateId]`, update the Prisma query `include` to add:
```typescript
include: {
  ...existing,
  _count: {
    select: {
      Mandate_Properties: true,
      Mandate_Clients: true,
    },
  },
}
```

Remove any `client` include that referenced the old FK relation.

**Step 2: Update mandates list GET**

In the list endpoint, update includes similarly. Replace any `client: { select: {...} }` with the junction count.

**Step 3: Update server actions**

In `get-mandate.ts` and `get-mandates.ts`, replace the `client` FK include with junction table includes:
```typescript
Mandate_Clients: {
  include: {
    Clients: {
      select: { id: true, friendlyId: true, client_name: true, client_status: true, primary_email: true, primary_phone: true },
    },
  },
},
Mandate_Properties: {
  include: {
    Properties: {
      select: { id: true, friendlyId: true, property_name: true, property_type: true, property_status: true },
    },
  },
},
```

**Step 4: Commit**

```bash
git add app/api/mandates/ actions/mandates/
git commit -m "feat(mandates): update GET endpoints to use junction tables instead of FK"
```

---

## Task 14: Update NewMandateWizard and QuickAddMandate

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/components/NewMandateWizard.tsx`
- Modify: `app/[locale]/app/(routes)/mandates/components/QuickAddMandate.tsx`
- Modify: `lib/validations/mandates.ts`

**Step 1: Update validation schema**

In `lib/validations/mandates.ts`, remove `clientId` from the mandate schema (it's no longer a direct FK). Client linking will happen post-creation via the linking UI.

If the wizard step 5 has a `clientId` field, it can be kept as a convenience — but it should now call the link-entities API after creation instead of including `clientId` in the mandate create payload.

**Step 2: Update NewMandateWizard**

In step 5 of the wizard, if there's a client selector (`clientId` combobox):
- Keep the UI but change the submit handler
- After the mandate is created (POST response includes mandate `id`), call `POST /api/mandates/link-entities` with `{ mandateId, clientIds: [selectedClientId] }`

**Step 3: Update QuickAddMandate**

Same approach — if it has a client field, link post-creation.

**Step 4: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mandates/components/ lib/validations/mandates.ts
git commit -m "feat(mandates): update wizards to use link-entities API for client linking"
```

---

## Task 15: Update Mandate Table Columns

**Files:**
- Modify: `app/[locale]/app/(routes)/mandates/table-components/columns.tsx`

**Step 1: Update client column**

The current `client` column accesses `row.original.client` (the old FK relation). Update it to access linked clients from the junction table data. The column should show the first linked client name (or count if multiple):

```typescript
{
  accessorKey: "linkedClients",
  header: t("table.clients"),
  cell: ({ row }) => {
    const clients = row.original.Mandate_Clients ?? [];
    if (clients.length === 0) return <span className="text-muted-foreground">—</span>;
    const first = clients[0].Clients;
    return (
      <div className="flex items-center gap-1">
        <Link href={`/app/crm/clients/${first.friendlyId}`}>{first.client_name}</Link>
        {clients.length > 1 && <Badge variant="secondary">+{clients.length - 1}</Badge>}
      </div>
    );
  },
}
```

**Step 2: Commit**

```bash
git add app/\[locale\]/app/\(routes\)/mandates/table-components/
git commit -m "feat(mandates): update table client column for M:N junction"
```

---

## Task 16: i18n — Add Translation Keys

**Files:**
- Modify: `locales/en/common.json` (or wherever linking translations live)
- Modify: `locales/el/common.json`

**Step 1: Add mandate linking translations**

Add these keys (check existing patterns for exact namespace):
```json
{
  "dialogs": {
    "linkMandates": "Link Mandates"
  },
  "placeholders": {
    "searchMandates": "Search mandates to link..."
  },
  "emptyStates": {
    "noMandatesAvailable": "No mandates available to link"
  }
}
```

And Greek translations:
```json
{
  "dialogs": {
    "linkMandates": "Σύνδεση Εντολών"
  },
  "placeholders": {
    "searchMandates": "Αναζήτηση εντολών για σύνδεση..."
  },
  "emptyStates": {
    "noMandatesAvailable": "Δεν υπάρχουν διαθέσιμες εντολές"
  }
}
```

**Step 2: Commit**

```bash
git add locales/
git commit -m "feat(i18n): add mandate linking translations (en, el)"
```

---

## Task 17: Verify Build

**Step 1: Run build**

```bash
pnpm build
```

Fix any TypeScript errors.

**Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint issues.

**Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors from mandate linking feature"
```

---

## Summary of All Files Changed

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `app/api/mandates/link-entities/route.ts` |
| Create | `app/api/mandates/[mandateId]/linked/route.ts` |
| Modify | `app/api/mls/properties/[propertyId]/linked/route.ts` |
| Modify | `app/api/crm/clients/[clientId]/linked/route.ts` |
| Create | `hooks/swr/useMandateLinked.ts` |
| Modify | `hooks/swr/useLinkMutations.ts` |
| Modify | `hooks/swr/usePropertyLinked.ts` |
| Modify | `hooks/swr/useClientLinked.ts` |
| Modify | `lib/search/entity-search.ts` |
| Modify | `hooks/swr/useUnifiedEntitySearch.ts` |
| Modify | `components/linking/LinkEntityDialog.tsx` |
| Modify | `components/linking/LinkedEntitiesPanel.tsx` |
| Modify | `app/[locale]/app/(routes)/mandates/[slug]/components/MandateView.tsx` |
| Modify | `app/[locale]/app/(routes)/mls/properties/[slug]/components/PropertyView.tsx` |
| Modify | `app/[locale]/app/(routes)/crm/clients/[slug]/components/ClientView.tsx` |
| Delete | `app/api/mandates/[mandateId]/link-client/route.ts` |
| Modify | `app/api/mandates/[mandateId]/route.ts` |
| Modify | `app/api/mandates/route.ts` |
| Modify | `actions/mandates/get-mandate.ts` |
| Modify | `actions/mandates/get-mandates.ts` |
| Modify | `app/[locale]/app/(routes)/mandates/components/NewMandateWizard.tsx` |
| Modify | `app/[locale]/app/(routes)/mandates/components/QuickAddMandate.tsx` |
| Modify | `lib/validations/mandates.ts` |
| Modify | `app/[locale]/app/(routes)/mandates/table-components/columns.tsx` |
| Modify | `locales/en/common.json` |
| Modify | `locales/el/common.json` |
