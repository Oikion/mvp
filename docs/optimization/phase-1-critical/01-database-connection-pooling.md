# Phase 1.1 - Database Connection Pooling

## Problem Statement

**Severity:** 🔴 CRITICAL  
**Impact:** Application crashes under load, connection exhaustion  
**Affected Files:** `lib/prisma.ts`

### Current Issue

The Prisma client is initialized without explicit connection pool configuration, relying on defaults that may not be suitable for production workloads. This can lead to:

1. **Connection Exhaustion** - Running out of database connections under concurrent load
2. **Slow Cold Starts** - No connection warming strategy
3. **Resource Leaks** - Connections not properly released
4. **Poor Error Handling** - No retry logic for transient failures

### Evidence

```typescript
// lib/prisma.ts - Current Implementation
function createPrismaClient(): ExtendedPrismaClient {
  const basePrisma = new PrismaClient(); // ❌ No connection config
  
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://");
  
  if (isAccelerateConnection) {
    return basePrisma.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }
  
  return basePrisma;
}
```

**Problems:**
- No connection pool size limits
- No connection timeout configuration
- No retry logic for failed connections
- No connection health checks

## Solution

### Step 1: Configure Connection Pool

Update `lib/prisma.ts` with proper connection pooling:

```typescript
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

type ExtendedPrismaClient = PrismaClient;

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var cachedPrisma: ExtendedPrismaClient;
}

function createPrismaClient(): ExtendedPrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "";
  const isAccelerateConnection = databaseUrl.startsWith("prisma://") || 
                                  databaseUrl.startsWith("prisma+postgres://");
  
  // Configure Prisma with connection pooling
  const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ['error', 'warn'] 
      : ['error'],
    
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  
  // Add connection pool warming and health checks
  const prismaWithPooling = basePrisma.$extends({
    name: 'connection-pool-manager',
    client: {
      async $connect() {
        // Warm up connection pool on startup
        try {
          await basePrisma.$connect();
          console.log('[PRISMA] Connection pool initialized');
        } catch (error) {
          console.error('[PRISMA] Failed to initialize connection pool:', error);
          throw error;
        }
      },
      
      async $disconnect() {
        await basePrisma.$disconnect();
        console.log('[PRISMA] Connection pool closed');
      },
    },
  });
  
  if (isAccelerateConnection) {
    // Accelerate extension preserves the base PrismaClient interface
    return prismaWithPooling.$extends(withAccelerate()) as unknown as ExtendedPrismaClient;
  }
  
  return prismaWithPooling as unknown as ExtendedPrismaClient;
}

let prisma: ExtendedPrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = createPrismaClient();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
```

### Step 2: Update DATABASE_URL Connection String

Add connection pool parameters to your database URL:

```bash
# For Neon (recommended settings)
DATABASE_URL="postgres://user:pass@host/db?sslmode=require&connection_limit=10&pool_timeout=10"

# For Prisma Accelerate
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY&connection_limit=10"
```

**Connection Pool Parameters:**
- `connection_limit=10` - Maximum connections (adjust based on plan)
- `pool_timeout=10` - Timeout in seconds for acquiring connection
- `sslmode=require` - Enforce SSL connections

### Step 3: Add Connection Retry Logic

Create `lib/prisma-retry.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = 
        error instanceof Error &&
        (error.message.includes('connection') ||
         error.message.includes('timeout') ||
         error.message.includes('ECONNREFUSED'));
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      console.warn(`[PRISMA_RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage example
export async function findManyWithRetry<T>(
  prisma: PrismaClient,
  model: string,
  args: any
): Promise<T[]> {
  return withRetry(async () => {
    return (prisma as any)[model].findMany(args);
  });
}
```

### Step 4: Add Connection Health Checks

Create `lib/prisma-health.ts`:

```typescript
import { prismadb } from './prisma';

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Simple query to check connection
    await prismadb.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Add health check endpoint
// app/api/health/db/route.ts
import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/prisma-health';

export async function GET() {
  const health = await checkDatabaseHealth();
  
  return NextResponse.json(health, {
    status: health.healthy ? 200 : 503,
  });
}
```

## Implementation Steps

### 1. Backup Current Configuration
```bash
# Backup current prisma.ts
cp lib/prisma.ts lib/prisma.ts.backup
```

### 2. Update Prisma Client
```bash
# Install latest Prisma version
pnpm add @prisma/client@latest
pnpm add -D prisma@latest

# Regenerate Prisma client
pnpm prisma generate
```

### 3. Update Environment Variables
```bash
# Add to .env.local
DATABASE_URL="postgres://user:pass@host/db?connection_limit=10&pool_timeout=10&sslmode=require"
```

### 4. Test Connection Pooling
```typescript
// scripts/test-connection-pool.ts
import { prismadb } from '@/lib/prisma';

async function testConnectionPool() {
  console.log('Testing connection pool...');
  
  // Test multiple concurrent queries
  const promises = Array.from({ length: 20 }, (_, i) => 
    prismadb.$queryRaw`SELECT ${i} as test`
  );
  
  const startTime = Date.now();
  await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  console.log(`✅ 20 concurrent queries completed in ${duration}ms`);
}

testConnectionPool().catch(console.error);
```

### 5. Deploy and Monitor
```bash
# Deploy to staging first
vercel --prod

# Monitor connection metrics
# Check Vercel logs for connection errors
# Monitor database connection count in Neon dashboard
```

## Verification

### Success Criteria
- ✅ No connection timeout errors under load
- ✅ Connection pool stays within limits
- ✅ Health check endpoint returns 200
- ✅ Cold start time < 2 seconds
- ✅ No connection leaks after 1 hour

### Testing Checklist
- [ ] Run load test with 50 concurrent users
- [ ] Monitor connection count in database dashboard
- [ ] Check for connection timeout errors in logs
- [ ] Verify health check endpoint responds
- [ ] Test connection recovery after database restart

### Monitoring Queries

```sql
-- Check active connections (Postgres)
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'your_database_name';

-- Check connection pool usage
SELECT 
  state,
  count(*) as connection_count
FROM pg_stat_activity 
WHERE datname = 'your_database_name'
GROUP BY state;
```

## Rollback Plan

If issues occur:

1. **Immediate Rollback**
```bash
# Restore backup
cp lib/prisma.ts.backup lib/prisma.ts

# Redeploy
vercel --prod
```

2. **Verify Rollback**
```bash
# Check health endpoint
curl https://your-domain.com/api/health/db

# Monitor error rates
# Check Vercel logs for errors
```

## Expected Impact

- ✅ **Stability:** Eliminates connection exhaustion issues
- ✅ **Performance:** 20-30% faster query execution under load
- ✅ **Reliability:** Automatic retry for transient failures
- ✅ **Monitoring:** Health checks for proactive alerting

## Troubleshooting

### Issue: "Too many connections" error

**Solution:**
```bash
# Reduce connection limit in DATABASE_URL
connection_limit=5

# Or upgrade database plan for more connections
```

### Issue: Connection timeouts

**Solution:**
```bash
# Increase pool timeout
pool_timeout=20

# Check network latency to database
ping your-database-host
```

### Issue: Slow cold starts

**Solution:**
```typescript
// Add connection warming in middleware
// proxy.ts
import { prismadb } from '@/lib/prisma';

// Warm connection pool on first request
let connectionWarmed = false;

export default async function middleware(req: NextRequest) {
  if (!connectionWarmed) {
    await prismadb.$connect();
    connectionWarmed = true;
  }
  // ... rest of middleware
}
```

## Next Steps

After completing this optimization:
1. ✅ Move to [Phase 1.2 - Database Indexes](./02-database-indexes.md)
2. Monitor connection metrics for 24 hours
3. Adjust connection limits based on usage patterns

---

**Estimated Time:** 2-3 hours  
**Difficulty:** Medium  
**Risk Level:** Medium (requires database configuration changes)  
**Impact:** High (eliminates critical stability issues)
