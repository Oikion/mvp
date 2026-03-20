# Phase 1.3 - N+1 Query Problems

## Problem Statement

**Severity:** 🔴 CRITICAL  
**Impact:** Exponential query growth, slow page loads, database overload  
**Affected Files:** `actions/crm/get-clients.ts`, `actions/mls/get-properties.ts`, and 50+ other files

### Current Issue

The N+1 query problem occurs when code executes one query to fetch a list of items, then executes N additional queries to fetch related data for each item. This results in:

1. **Exponential Query Growth** - 1 query becomes 101 queries for 100 items
2. **Slow Response Times** - Each query adds latency (typically 5-20ms each)
3. **Database Overload** - Hundreds of unnecessary queries under load
4. **Poor Scalability** - Performance degrades linearly with data growth

### Evidence

**Example 1: Client List with Contacts**
```typescript
// actions/crm/get-clients.ts - CURRENT (N+1 Problem)
const data = await prismadb.clients.findMany({
  where: { organizationId },
  include: {
    Users_Clients_assigned_toToUsers: {
      select: { name: true }
    },
    Client_Contacts: {  // ❌ Separate query per client
      select: {
        contact_first_name: true,
        contact_last_name: true,
      },
      take: 10,
    },
  },
  take: 500, // Fetches 500 clients
});

// Result: 1 + 500 = 501 queries!
// Query 1: SELECT * FROM Clients WHERE organizationId = ?
// Query 2-501: SELECT * FROM Client_Contacts WHERE clientId = ? (x500)
```

**Example 2: Properties with Documents**
```typescript
// actions/mls/get-properties.ts - CURRENT (N+1 Problem)
const data = await prismadb.properties.findMany({
  where: { organizationId },
  include: {
    Users_Properties_assigned_toToUsers: { 
      select: { name: true } 
    },
    Documents: {  // ❌ Separate query per property
      where: {
        document_file_mimeType: {
          startsWith: "image/",
        },
      },
      select: {
        document_file_url: true,
      },
      take: 1,
    },
  },
  orderBy: { createdAt: "desc" },
});

// Result: 1 + N queries for N properties
```

**Performance Impact:**
- 100 clients: 101 queries (~2 seconds)
- 500 clients: 501 queries (~10 seconds)
- 1000 clients: 1001 queries (~20 seconds)

## Solution

### Strategy 1: Use Proper Select Instead of Include

**Principle:** Use `select` with nested relations instead of `include` to optimize query execution.

```typescript
// BEFORE (N+1 Problem)
const clients = await prismadb.clients.findMany({
  include: {
    Client_Contacts: true,  // ❌ N+1
  },
});

// AFTER (Single Query)
const clients = await prismadb.clients.findMany({
  select: {
    id: true,
    client_name: true,
    primary_email: true,
    client_status: true,
    createdAt: true,
    assigned_to: true,
    Users_Clients_assigned_toToUsers: {
      select: { name: true }
    },
    _count: {
      select: { Client_Contacts: true }  // ✅ Just count, no data
    }
  },
});
```

### Strategy 2: Separate Queries with IN Clause

**Principle:** Fetch related data in a second query using an IN clause.

```typescript
// Step 1: Fetch main entities
const clients = await prismadb.clients.findMany({
  where: { organizationId },
  select: {
    id: true,
    client_name: true,
    primary_email: true,
    client_status: true,
    createdAt: true,
  },
  take: 100,
});

const clientIds = clients.map(c => c.id);

// Step 2: Fetch related data in bulk (1 query instead of N)
const contacts = await prismadb.client_Contacts.findMany({
  where: {
    clientsIDs: { in: clientIds },
  },
  select: {
    clientsIDs: true,
    contact_first_name: true,
    contact_last_name: true,
  },
});

// Step 3: Map contacts to clients
const contactsByClient = contacts.reduce((acc, contact) => {
  if (!acc[contact.clientsIDs!]) {
    acc[contact.clientsIDs!] = [];
  }
  acc[contact.clientsIDs!].push(contact);
  return acc;
}, {} as Record<string, typeof contacts>);

// Step 4: Combine data
const clientsWithContacts = clients.map(client => ({
  ...client,
  contacts: contactsByClient[client.id] || [],
}));

// Result: 2 queries total (instead of 101)
```

### Strategy 3: Use Aggregations Instead of Full Data

**Principle:** Use `_count` or aggregations when you don't need full related data.

```typescript
// BEFORE (N+1 for counts)
const properties = await prismadb.properties.findMany({
  include: {
    Documents: true,  // ❌ Fetches all documents just to count
  },
});
const propertiesWithCounts = properties.map(p => ({
  ...p,
  documentCount: p.Documents.length,
}));

// AFTER (Single query with count)
const properties = await prismadb.properties.findMany({
  select: {
    id: true,
    property_name: true,
    property_status: true,
    _count: {
      select: { 
        Documents: true,  // ✅ Just count, no data fetched
        Client_Properties: true,
      }
    }
  },
});
```

## Implementation

### Fix 1: Update `actions/crm/get-clients.ts`

```typescript
// actions/crm/get-clients.ts - OPTIMIZED
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions/action-guards";

export const getClients = async () => {
  const guard = await requireAction("client:read");
  if (guard) return [];

  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  // ✅ OPTIMIZED: Single query with proper select
  const data = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      client_status: true,
      createdAt: true,
      assigned_to: true,
      Users_Clients_assigned_toToUsers: {
        select: { 
          id: true,
          name: true 
        }
      },
      // Use count instead of fetching all contacts
      _count: {
        select: { Client_Contacts: true }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // Reduced from 500 for better performance
  });

  // Map to legacy format
  return data.map((c) => ({
    ...c,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status === "ACTIVE" ? "Active" : "IN_PROGRESS",
    assigned_to_user: c.Users_Clients_assigned_toToUsers,
    contactCount: c._count.Client_Contacts,
  }));
};
```

### Fix 2: Update `actions/mls/get-properties.ts`

```typescript
// actions/mls/get-properties.ts - OPTIMIZED
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { canPerformAction, getActionPermissionLevel } from "@/lib/permissions";
import { serializePrisma } from "@/lib/prisma-serialize";

export const getProperties = async () => {
  const permCheck = await canPerformAction("property:read");
  if (!permCheck.allowed && !permCheck.requiresOwnership) {
    return [];
  }
  
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];
  
  const permissionLevel = await getActionPermissionLevel("property:read");
  const canViewAll = permissionLevel === "all";
  
  // ✅ OPTIMIZED: Fetch properties without N+1
  const properties = await prismadb.properties.findMany({
    where: { organizationId },
    select: {
      id: true,
      property_name: true,
      property_status: true,
      property_type: true,
      price: true,
      address_city: true,
      address_street: true,
      bedrooms: true,
      bathrooms: true,
      square_feet: true,
      createdAt: true,
      assigned_to: true,
      Users_Properties_assigned_toToUsers: { 
        select: { 
          id: true,
          name: true 
        } 
      },
      _count: {
        select: { Documents: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Add pagination
  });

  // Fetch first image for each property in a separate optimized query
  const propertyIds = properties.map(p => p.id);
  
  const firstImages = await prismadb.documents.findMany({
    where: {
      linkedPropertiesIds: { hasSome: propertyIds },
      document_file_mimeType: { startsWith: "image/" },
    },
    select: {
      document_file_url: true,
      linkedPropertiesIds: true,
    },
    distinct: ['linkedPropertiesIds'],
  });

  // Create image map
  const imageMap = new Map<string, string>();
  firstImages.forEach(img => {
    img.linkedPropertiesIds.forEach(propId => {
      if (!imageMap.has(propId)) {
        imageMap.set(propId, img.document_file_url);
      }
    });
  });

  // Combine data
  const mappedData = properties.map((p) => ({
    ...p,
    assigned_to_user: p.Users_Properties_assigned_toToUsers,
    documentCount: p._count.Documents,
    firstImage: imageMap.get(p.id) || null,
  }));
  
  // Serialize for client components
  return serializePrisma(mappedData);
};
```

### Fix 3: Create Helper for Bulk Related Data

```typescript
// lib/prisma-helpers.ts - NEW FILE
import { prismadb } from './prisma';

/**
 * Fetch related data in bulk to avoid N+1 queries
 */
export async function fetchRelatedInBulk<T extends { id: string }>(
  parentIds: string[],
  fetchFn: (ids: string[]) => Promise<any[]>,
  mapKey: string = 'id'
): Promise<Map<string, any[]>> {
  if (parentIds.length === 0) {
    return new Map();
  }

  const relatedData = await fetchFn(parentIds);
  
  const dataMap = new Map<string, any[]>();
  relatedData.forEach(item => {
    const key = item[mapKey];
    if (!dataMap.has(key)) {
      dataMap.set(key, []);
    }
    dataMap.get(key)!.push(item);
  });
  
  return dataMap;
}

/**
 * Example usage: Fetch contacts for multiple clients
 */
export async function getClientContacts(clientIds: string[]) {
  return fetchRelatedInBulk(
    clientIds,
    async (ids) => {
      return await prismadb.client_Contacts.findMany({
        where: { clientsIDs: { in: ids } },
        select: {
          clientsIDs: true,
          contact_first_name: true,
          contact_last_name: true,
          email: true,
          mobile_phone: true,
        },
        take: 10 * ids.length, // Limit per client
      });
    },
    'clientsIDs'
  );
}

/**
 * Example usage: Fetch documents for multiple properties
 */
export async function getPropertyDocuments(propertyIds: string[]) {
  const documents = await prismadb.documents.findMany({
    where: {
      linkedPropertiesIds: { hasSome: propertyIds },
      document_file_mimeType: { startsWith: "image/" },
    },
    select: {
      id: true,
      document_file_url: true,
      linkedPropertiesIds: true,
    },
  });

  // Map documents to properties
  const docMap = new Map<string, any[]>();
  documents.forEach(doc => {
    doc.linkedPropertiesIds.forEach(propId => {
      if (!docMap.has(propId)) {
        docMap.set(propId, []);
      }
      docMap.get(propId)!.push(doc);
    });
  });

  return docMap;
}
```

### Fix 4: Update Dashboard Queries

```typescript
// actions/dashboard/get-recent-clients.ts - OPTIMIZED
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

export async function getRecentClients(limit: number = 8) {
  const organizationId = await getCurrentOrgIdSafe();
  if (!organizationId) return [];

  // ✅ OPTIMIZED: Use select with counts
  const clients = await prismadb.clients.findMany({
    where: { organizationId },
    select: {
      id: true,
      client_name: true,
      primary_email: true,
      client_status: true,
      createdAt: true,
      _count: {
        select: { 
          Client_Contacts: true,
          Client_Properties: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return clients.map(c => ({
    id: c.id,
    name: c.client_name,
    email: c.primary_email,
    status: c.client_status,
    createdAt: c.createdAt,
    contactCount: c._count.Client_Contacts,
    propertyCount: c._count.Client_Properties,
  }));
}
```

## Implementation Steps

### 1. Identify N+1 Queries

```bash
# Run query analyzer
pnpm tsx scripts/analyze-n-plus-1.ts
```

```typescript
// scripts/analyze-n-plus-1.ts
import { prismadb } from '@/lib/prisma';

let queryCount = 0;
const queries: any[] = [];

prismadb.$on('query' as never, (e: any) => {
  queryCount++;
  queries.push({
    query: e.query,
    params: e.params,
    duration: e.duration,
  });
});

// Run typical operations
async function testOperations() {
  console.log('Testing for N+1 queries...\n');
  
  // Test 1: Get clients
  queryCount = 0;
  await getClients();
  console.log(`getClients: ${queryCount} queries`);
  
  // Test 2: Get properties
  queryCount = 0;
  await getProperties();
  console.log(`getProperties: ${queryCount} queries`);
  
  // Test 3: Dashboard
  queryCount = 0;
  await getDashboardData();
  console.log(`getDashboard: ${queryCount} queries`);
}
```

### 2. Apply Fixes Incrementally

```bash
# Fix high-impact files first
1. actions/crm/get-clients.ts
2. actions/mls/get-properties.ts
3. actions/dashboard/*.ts
4. app/[locale]/app/(routes)/page.tsx
```

### 3. Test Each Fix

```typescript
// Test query count reduction
async function testQueryReduction() {
  const before = await measureQueries(() => getClientsOld());
  const after = await measureQueries(() => getClientsNew());
  
  console.log(`Queries reduced: ${before} → ${after}`);
  console.log(`Improvement: ${((before - after) / before * 100).toFixed(1)}%`);
}
```

### 4. Update All Affected Files

Create a checklist of files to update:

```markdown
- [ ] actions/crm/get-clients.ts
- [ ] actions/crm/get-client.ts
- [ ] actions/mls/get-properties.ts
- [ ] actions/mls/get-property.ts
- [ ] actions/dashboard/get-recent-clients.ts
- [ ] actions/dashboard/get-recent-properties.ts
- [ ] actions/calendar/get-events.ts
- [ ] actions/documents/get-documents.ts
- [ ] actions/messaging/get-conversations.ts
- [ ] actions/social-feed/get-posts.ts
```

## Verification

### Success Criteria
- ✅ Query count reduced by 80-95%
- ✅ Response times improved by 60-80%
- ✅ No N+1 patterns in hot paths
- ✅ Database CPU usage reduced by 40-60%
- ✅ All tests passing

### Testing Checklist
- [ ] Run N+1 detection script
- [ ] Compare query counts before/after
- [ ] Measure response times
- [ ] Load test with 100 concurrent users
- [ ] Verify data integrity

### Performance Testing

```typescript
// scripts/benchmark-n-plus-1-fixes.ts
import { performance } from 'perf_hooks';

async function benchmark() {
  const results: any[] = [];
  
  // Test with different data sizes
  for (const size of [10, 50, 100, 500]) {
    const start = performance.now();
    const data = await getClients(size);
    const duration = performance.now() - start;
    
    results.push({
      size,
      duration: Math.round(duration),
      queriesPerItem: queryCount / size,
    });
  }
  
  console.table(results);
}
```

## Expected Impact

### Query Reduction
| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Get 100 Clients | 101 queries | 2 queries | 98% reduction |
| Get 100 Properties | 101 queries | 2 queries | 98% reduction |
| Dashboard Load | 50+ queries | 20 queries | 60% reduction |

### Response Time Improvement
| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Get 100 Clients | 2.1s | 0.3s | 86% faster |
| Get 100 Properties | 2.4s | 0.4s | 83% faster |
| Dashboard Load | 3.2s | 1.1s | 66% faster |

### Database Load Reduction
- **CPU Usage:** 40-60% reduction
- **Connection Count:** 50-70% reduction
- **Query Throughput:** 3-5x improvement

## Troubleshooting

### Issue: Data mapping complexity

**Problem:** Complex data structures after optimization

**Solution:**
```typescript
// Create helper function for data transformation
function mapClientData(clients: any[], contacts: Map<string, any[]>) {
  return clients.map(client => ({
    ...client,
    contacts: contacts.get(client.id) || [],
  }));
}
```

### Issue: Performance regression

**Problem:** Optimized query slower than N+1

**Solution:**
```typescript
// Check if indexes exist
// Verify query plan with EXPLAIN ANALYZE
// Consider batch size optimization
const BATCH_SIZE = 100;
const batches = chunk(ids, BATCH_SIZE);
const results = await Promise.all(
  batches.map(batch => fetchBatch(batch))
);
```

### Issue: Missing related data

**Problem:** Some relations not included

**Solution:**
```typescript
// Ensure all required relations are in select
select: {
  id: true,
  // ... all required fields
  _count: {
    select: {
      // All count relations
    }
  }
}
```

## Best Practices

### 1. Always Use Select Over Include

```typescript
// ❌ BAD: Include fetches all fields
include: { relation: true }

// ✅ GOOD: Select only needed fields
select: {
  relation: {
    select: { id: true, name: true }
  }
}
```

### 2. Use Counts When Possible

```typescript
// ❌ BAD: Fetch all to count
include: { items: true }
const count = result.items.length

// ✅ GOOD: Use _count
select: {
  _count: { select: { items: true } }
}
```

### 3. Batch Related Queries

```typescript
// ✅ GOOD: Fetch related data in bulk
const ids = items.map(i => i.id);
const related = await fetchRelated({ id: { in: ids } });
```

### 4. Add Pagination

```typescript
// ✅ GOOD: Always limit results
findMany({
  take: 100,
  skip: page * 100,
})
```

## Next Steps

After completing this optimization:
1. ✅ Move to [Phase 1.4 - Credential Rotation](./04-credential-rotation.md)
2. Monitor query counts in production
3. Set up alerts for N+1 patterns
4. Document query patterns for team

---

**Estimated Time:** 4-6 hours  
**Difficulty:** Medium-High  
**Risk Level:** Medium (requires careful testing)  
**Impact:** Very High (60-80% performance improvement)
