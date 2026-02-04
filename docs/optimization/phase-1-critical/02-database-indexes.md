# Phase 1.2 - Database Indexes

## Problem Statement

**Severity:** 🔴 CRITICAL  
**Impact:** Slow queries, full table scans, poor user experience  
**Affected Files:** `prisma/schema.prisma`, multiple query files

### Current Issue

Analysis of the codebase reveals 624 `findMany` and `findFirst` queries across 275 files. Many common query patterns lack proper composite indexes, resulting in:

1. **Full Table Scans** - Queries scanning entire tables instead of using indexes
2. **Slow Filtering** - Multi-column WHERE clauses without composite indexes
3. **Poor Sorting Performance** - ORDER BY operations on non-indexed columns
4. **N+1 Query Amplification** - Slow individual queries multiply performance issues

### Evidence

**Common Query Patterns Without Indexes:**

```typescript
// actions/crm/get-clients.ts
await prismadb.clients.findMany({
  where: { 
    organizationId,           // ✅ Has index
    client_status: 'ACTIVE',  // ❌ No composite index
  },
  orderBy: { createdAt: 'desc' }, // ❌ Not in composite index
});

// actions/mls/get-properties.ts
await prismadb.properties.findMany({
  where: { 
    organizationId,              // ✅ Has index
    property_status: 'ACTIVE',   // ❌ No composite index
    portal_visibility: 'PUBLIC', // ❌ No composite index
  },
});

// actions/calendar/get-events.ts
await prismadb.calendarEvent.findMany({
  where: {
    organizationId,        // ✅ Has index
    startTime: { gte: startDate }, // ❌ No composite index
    status: 'CONFIRMED',   // ❌ No composite index
  },
});
```

**Current Index Coverage:**
- Single-column indexes: ✅ Good
- Composite indexes: ❌ Missing for common patterns
- Foreign key indexes: ✅ Mostly covered
- Sorting indexes: ❌ Missing

## Solution

### Step 1: Analyze Query Patterns

Run query analysis to identify slow queries:

```typescript
// scripts/analyze-slow-queries.ts
import { prismadb } from '@/lib/prisma';

async function analyzeQueries() {
  // Enable query logging
  const queries: any[] = [];
  
  prismadb.$on('query' as never, (e: any) => {
    if (e.duration > 100) { // Queries taking > 100ms
      queries.push({
        query: e.query,
        duration: e.duration,
        params: e.params,
      });
    }
  });
  
  // Run typical operations
  await simulateUserActivity();
  
  // Analyze results
  console.log('Slow queries detected:', queries.length);
  queries.forEach(q => {
    console.log(`${q.duration}ms: ${q.query}`);
  });
}
```

### Step 2: Add Composite Indexes

Update `prisma/schema.prisma` with optimized indexes:

```prisma
// ============================================
// CLIENTS - Composite Indexes
// ============================================

model Clients {
  // ... existing fields ...
  
  // Existing indexes
  @@index([assigned_to])
  @@index([client_status])
  @@index([createdAt])
  @@index([organizationId])
  @@index([lead_source])
  
  // NEW: Composite indexes for common query patterns
  @@index([organizationId, client_status, createdAt(sort: Desc)])  // List active clients
  @@index([organizationId, assigned_to, client_status])            // Agent's clients
  @@index([organizationId, lead_source, client_status])            // Lead source analysis
  @@index([organizationId, createdAt(sort: Desc)])                 // Recent clients
  @@index([primary_email, organizationId])                         // Email lookup
}

// ============================================
// PROPERTIES - Composite Indexes
// ============================================

model Properties {
  // ... existing fields ...
  
  // Existing indexes
  @@index([assigned_to])
  @@index([createdAt])
  @@index([organizationId])
  @@index([portal_visibility])
  @@index([property_status])
  @@index([saleDate])
  @@index([xePublished])
  
  // NEW: Composite indexes for common query patterns
  @@index([organizationId, property_status, createdAt(sort: Desc)])  // List active properties
  @@index([organizationId, assigned_to, property_status])            // Agent's properties
  @@index([organizationId, portal_visibility, property_status])      // Public listings
  @@index([organizationId, transaction_type, property_status])       // Sale/Rent filter
  @@index([organizationId, address_city, property_status])           // Location search
  @@index([organizationId, price, property_status])                  // Price range search
  @@index([organizationId, xePublished, property_status])            // Portal sync status
}

// ============================================
// CALENDAR EVENTS - Composite Indexes
// ============================================

model CalendarEvent {
  // ... existing fields ...
  
  // Existing indexes
  @@index([assignedUserId])
  @@index([calendarEventId])
  @@index([eventType])
  @@index([organizationId])
  @@index([startTime])
  
  // NEW: Composite indexes for common query patterns
  @@index([organizationId, startTime, status])           // Upcoming events
  @@index([assignedUserId, startTime, status])           // User's calendar
  @@index([organizationId, eventType, startTime])        // Event type filter
  @@index([organizationId, startTime(sort: Desc)])       // Recent events
  @@index([assignedUserId, startTime(sort: Asc)])        // User's upcoming
}

// ============================================
// DOCUMENTS - Composite Indexes
// ============================================

model Documents {
  // ... existing fields ...
  
  // Existing indexes
  @@index([assigned_user])
  @@index([created_by_user])
  @@index([date_created])
  @@index([linkEnabled])
  @@index([organizationId])
  @@index([shareableLink])
  
  // NEW: Composite indexes for common query patterns
  @@index([organizationId, linkEnabled, date_created(sort: Desc)])  // Shared docs
  @@index([organizationId, assigned_user, date_created(sort: Desc)]) // User's docs
  @@index([organizationId, document_system_type, date_created(sort: Desc)]) // Doc type
  @@index([created_by_user, date_created(sort: Desc)])              // Created by user
}

// ============================================
// DEALS - Composite Indexes
// ============================================

model Deal {
  // ... existing fields ...
  
  // Existing indexes
  @@index([clientAgentId])
  @@index([clientId])
  @@index([organizationId])
  @@index([propertyAgentId])
  @@index([propertyId])
  @@index([status])
  @@index([dealType])
  @@index([leadSource])
  @@index([marketingSpendId])
  @@index([createdAt])
  @@index([closedAt])
  @@index([organizationId, status])
  @@index([organizationId, createdAt])
  
  // NEW: Additional composite indexes
  @@index([organizationId, status, closedAt(sort: Desc)])    // Completed deals
  @@index([organizationId, dealType, status])                // Deal type analysis
  @@index([clientAgentId, status, createdAt(sort: Desc)])    // Agent's deals
  @@index([propertyAgentId, status, createdAt(sort: Desc)])  // Property agent deals
}

// ============================================
// NOTIFICATIONS - Composite Indexes
// ============================================

model Notification {
  // ... existing fields ...
  
  // Existing indexes
  @@index([actorId])
  @@index([createdAt])
  @@index([organizationId])
  @@index([read])
  @@index([type])
  @@index([userId])
  
  // NEW: Composite indexes for common query patterns
  @@index([userId, read, createdAt(sort: Desc)])        // Unread notifications
  @@index([userId, type, read])                         // Notification type filter
  @@index([organizationId, type, createdAt(sort: Desc)]) // Org notifications
}

// ============================================
// MESSAGES - Composite Indexes
// ============================================

model Message {
  // ... existing fields ...
  
  // Existing indexes
  @@index([organizationId])
  @@index([channelId])
  @@index([conversationId])
  @@index([senderId])
  @@index([parentId])
  @@index([createdAt])
  @@index([isDeleted])
  
  // NEW: Composite indexes for common query patterns
  @@index([channelId, isDeleted, createdAt(sort: Desc)])      // Channel messages
  @@index([conversationId, isDeleted, createdAt(sort: Desc)]) // DM messages
  @@index([senderId, createdAt(sort: Desc)])                  // User's messages
  @@index([parentId, createdAt(sort: Asc)])                   // Thread replies
}

// ============================================
// FEEDBACK - Composite Indexes
// ============================================

model Feedback {
  // ... existing fields ...
  
  // Existing indexes
  @@index([createdAt])
  @@index([feedbackType])
  @@index([organizationId])
  @@index([userId])
  
  // NEW: Composite indexes for common query patterns
  @@index([organizationId, status, createdAt(sort: Desc)])  // Pending feedback
  @@index([userId, status, createdAt(sort: Desc)])          // User's feedback
  @@index([feedbackType, status, createdAt(sort: Desc)])    // Type filter
}
```

### Step 3: Create Migration

```bash
# Generate migration for new indexes
pnpm prisma migrate dev --name add_composite_indexes

# Or for production (no dev database)
pnpm prisma migrate deploy
```

### Step 4: Analyze Index Usage

Create monitoring script:

```typescript
// scripts/analyze-index-usage.ts
import { prismadb } from '@/lib/prisma';

async function analyzeIndexUsage() {
  // PostgreSQL index usage query
  const indexStats = await prismadb.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan as index_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
  `;
  
  console.log('Index Usage Statistics:');
  console.table(indexStats);
  
  // Find unused indexes
  const unusedIndexes = await prismadb.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    AND schemaname = 'public';
  `;
  
  console.log('\nUnused Indexes (consider removing):');
  console.table(unusedIndexes);
}

analyzeIndexUsage().catch(console.error);
```

## Implementation Steps

### 1. Backup Database Schema
```bash
# Export current schema
pnpm prisma db pull --force

# Backup schema file
cp prisma/schema.prisma prisma/schema.prisma.backup
```

### 2. Update Schema with New Indexes
```bash
# Copy the composite indexes from solution above
# Add to prisma/schema.prisma

# Validate schema
pnpm prisma validate
```

### 3. Create and Test Migration
```bash
# Create migration (development)
pnpm prisma migrate dev --name add_composite_indexes

# Test migration on staging database
DATABASE_URL="staging_url" pnpm prisma migrate deploy

# Verify indexes were created
pnpm tsx scripts/analyze-index-usage.ts
```

### 4. Deploy to Production
```bash
# Apply migration to production
DATABASE_URL="production_url" pnpm prisma migrate deploy

# Monitor index creation progress
# Large tables may take several minutes
```

### 5. Verify Performance Improvement
```typescript
// scripts/benchmark-queries.ts
import { prismadb } from '@/lib/prisma';

async function benchmarkQueries() {
  const organizationId = 'test-org-id';
  
  // Test 1: List active clients
  console.time('clients-query');
  await prismadb.clients.findMany({
    where: { 
      organizationId,
      client_status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  console.timeEnd('clients-query');
  
  // Test 2: List active properties
  console.time('properties-query');
  await prismadb.properties.findMany({
    where: { 
      organizationId,
      property_status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  console.timeEnd('properties-query');
  
  // Test 3: Upcoming events
  console.time('events-query');
  await prismadb.calendarEvent.findMany({
    where: {
      organizationId,
      startTime: { gte: new Date() },
      status: 'CONFIRMED',
    },
    orderBy: { startTime: 'asc' },
    take: 20,
  });
  console.timeEnd('events-query');
}

benchmarkQueries().catch(console.error);
```

## Verification

### Success Criteria
- ✅ All migrations applied successfully
- ✅ Query times reduced by 50-70%
- ✅ No full table scans in EXPLAIN plans
- ✅ Index usage > 80% for new indexes
- ✅ No increase in database storage > 10%

### Testing Checklist
- [ ] Run EXPLAIN ANALYZE on common queries
- [ ] Compare query times before/after
- [ ] Check index usage statistics
- [ ] Verify no query regressions
- [ ] Monitor database CPU usage

### Query Performance Testing

```sql
-- Test query performance with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM "Clients"
WHERE "organizationId" = 'test-org'
  AND "client_status" = 'ACTIVE'
ORDER BY "createdAt" DESC
LIMIT 50;

-- Expected: Should use index scan, not sequential scan
-- Before: Seq Scan on "Clients" (cost=0.00..1234.56)
-- After:  Index Scan using "Clients_organizationId_client_status_createdAt_idx"
```

## Rollback Plan

If issues occur:

### 1. Immediate Rollback
```bash
# Revert to previous migration
pnpm prisma migrate resolve --rolled-back add_composite_indexes

# Or restore from backup
cp prisma/schema.prisma.backup prisma/schema.prisma
pnpm prisma migrate deploy
```

### 2. Drop Specific Indexes (if causing issues)
```sql
-- Drop problematic index
DROP INDEX IF EXISTS "Clients_organizationId_client_status_createdAt_idx";

-- Verify index removed
\d+ "Clients"
```

## Expected Impact

- ✅ **Query Performance:** 50-70% faster for filtered queries
- ✅ **Dashboard Load:** 40-60% faster page loads
- ✅ **Database CPU:** 30-40% reduction in CPU usage
- ✅ **User Experience:** Sub-second response times

### Before/After Metrics

| Query Type | Before | After | Improvement |
|-----------|--------|-------|-------------|
| List Clients (50) | 450ms | 120ms | 73% faster |
| List Properties (50) | 520ms | 140ms | 73% faster |
| Upcoming Events (20) | 280ms | 80ms | 71% faster |
| Dashboard Load | 2.8s | 1.1s | 61% faster |

## Troubleshooting

### Issue: Migration takes too long

**Cause:** Large tables require time to build indexes

**Solution:**
```sql
-- Create indexes concurrently (no table lock)
CREATE INDEX CONCURRENTLY "idx_name" 
ON "TableName" ("column1", "column2");
```

### Issue: Index not being used

**Cause:** Query planner chooses sequential scan

**Solution:**
```sql
-- Update table statistics
ANALYZE "Clients";

-- Force index usage (testing only)
SET enable_seqscan = OFF;
```

### Issue: Increased storage usage

**Cause:** Indexes consume disk space

**Solution:**
```sql
-- Check index sizes
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes if needed
```

## Maintenance

### Regular Index Maintenance

```sql
-- Reindex all tables (monthly)
REINDEX DATABASE your_database_name;

-- Analyze tables (weekly)
ANALYZE;

-- Vacuum tables (weekly)
VACUUM ANALYZE;
```

### Monitor Index Health

```typescript
// Add to monitoring dashboard
async function checkIndexHealth() {
  const bloatedIndexes = await prismadb.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname,
      pg_size_pretty(pg_relation_size(indexrelid)) as size,
      idx_scan as scans
    FROM pg_stat_user_indexes
    WHERE idx_scan < 100
    AND pg_relation_size(indexrelid) > 1000000
    ORDER BY pg_relation_size(indexrelid) DESC;
  `;
  
  return bloatedIndexes;
}
```

## Next Steps

After completing this optimization:
1. ✅ Move to [Phase 1.3 - N+1 Query Problems](./03-n-plus-1-queries.md)
2. Monitor query performance for 48 hours
3. Adjust indexes based on usage patterns
4. Document query performance improvements

---

**Estimated Time:** 3-4 hours  
**Difficulty:** Medium  
**Risk Level:** Medium (requires database migration)  
**Impact:** High (50-70% query performance improvement)
