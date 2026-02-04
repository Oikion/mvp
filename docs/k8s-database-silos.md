# K8s Database Silos Architecture

## Overview

This document describes the per-organization database silo architecture for Oikion. This feature allows enterprise organizations to have completely isolated databases while sharing the same application infrastructure.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Oikion Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Org A     │  │   Org B     │  │   Org C     │              │
│  │  (Shared)   │  │   (Silo)    │  │   (Silo)    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                       │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │   Shared    │  │  Dedicated  │  │  Dedicated  │              │
│  │  Database   │  │  Database   │  │  Database   │              │
│  │  (Default)  │  │   (Silo)    │  │   (Silo)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Database Models

### OrganizationSettings

Stores per-org configuration including database silo settings:

```prisma
model OrganizationSettings {
  id                   String   @id
  organizationId       String   @unique
  
  // Database Silo Settings
  databaseSiloEnabled  Boolean  @default(false)
  databaseHost         String?
  databasePort         Int?     @default(5432)
  databaseName         String?
  databaseUser         String?
  databasePassword     String?  // Encrypted
  databaseSslEnabled   Boolean  @default(true)
  
  // K8s Settings
  k8sNamespace         String?
  k8sResourceQuota     Json?
  k8sStorageClass      String?
}
```

### OrganizationDatabasePool

Manages active database connections for silos:

```prisma
model OrganizationDatabasePool {
  id               String   @id
  organizationId   String   @unique
  connectionString String   // Encrypted
  poolSize         Int      @default(5)
  isActive         Boolean  @default(true)
  lastHealthCheck  DateTime?
  healthStatus     String?  // "healthy" | "degraded" | "down"
}
```

## Implementation Steps

### Phase 1: Database Infrastructure

1. **Create K8s Operator for Database Provisioning**
   ```yaml
   apiVersion: oikion.io/v1
   kind: DatabaseSilo
   metadata:
     name: org-123-database
   spec:
     organizationId: org_123
     storageSize: 10Gi
     replicas: 1
     backup:
       enabled: true
       schedule: "0 2 * * *"
   ```

2. **Database Provisioning Service**
   - Provisions new PostgreSQL instances on demand
   - Configures replication and backups
   - Creates database users and grants

3. **Connection Pool Manager**
   - Maintains connection pools per organization
   - Health checking and failover
   - Connection string rotation

### Phase 2: Application Integration

1. **Dynamic Prisma Client**
   ```typescript
   async function getOrgPrismaClient(organizationId: string) {
     const connection = await getOrgDatabaseConnection(organizationId);
     
     if (!connection) {
       return prismadb; // Use shared database
     }
     
     // Return org-specific Prisma client
     return new PrismaClient({
       datasources: {
         db: { url: connection.connectionString }
       }
     });
   }
   ```

2. **Middleware for Request Routing**
   ```typescript
   // In proxy.ts middleware
   export async function middleware(request: NextRequest) {
     const orgId = getOrgIdFromRequest(request);
     const client = await getOrgPrismaClient(orgId);
     
     // Attach to request context
     request.prisma = client;
   }
   ```

### Phase 3: Migration Tools

1. **Data Migration Script**
   - Migrate existing org data to dedicated silo
   - Verify data integrity
   - Update connection settings

2. **Rollback Capability**
   - Ability to migrate back to shared database
   - Data synchronization during migration window

## K8s Resource Management

### Namespace per Organization

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: oikion-org-123
  labels:
    oikion.io/organization: "org_123"
    oikion.io/tier: "enterprise"
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: org-quota
  namespace: oikion-org-123
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    persistentvolumeclaims: "5"
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: org-isolation
  namespace: oikion-org-123
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              oikion.io/organization: "org_123"
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              oikion.io/organization: "org_123"
```

## Security Considerations

1. **Encryption at Rest**
   - All database credentials encrypted using platform KMS
   - Connection strings never logged or exposed

2. **Encryption in Transit**
   - TLS required for all database connections
   - Certificate rotation automated

3. **Access Control**
   - Database users have minimum required permissions
   - No cross-org database access possible

4. **Audit Logging**
   - All settings changes logged
   - Database access monitored

## API Endpoints

### Admin API (Platform Admin Only)

```
POST /api/platform-admin/org-settings/create-silo
PUT  /api/platform-admin/org-settings/[orgId]/database
GET  /api/platform-admin/org-settings/[orgId]/database/health
POST /api/platform-admin/org-settings/[orgId]/database/migrate
```

### Organization Admin API

```
GET  /api/admin/settings
PUT  /api/admin/settings/api-keys
GET  /api/admin/settings/usage
```

## Usage Tracking

Track AI and database usage per organization:

```typescript
// Track AI credits usage
await trackAICreditsUsage(organizationId, tokensUsed);

// Check if exceeded
const exceeded = await hasExceededAICredits(organizationId);
if (exceeded) {
  throw new Error("AI credits limit exceeded");
}
```

## Future Enhancements

1. **Multi-Region Silos**
   - Deploy database silos in multiple regions
   - Automatic failover and replication

2. **Custom Domain Support**
   - Organizations can use their own domain
   - SSL certificate management

3. **Dedicated Compute**
   - Dedicated K8s nodes for enterprise orgs
   - Guaranteed resources

4. **Backup & Restore**
   - Self-service backup/restore
   - Point-in-time recovery

## Implementation Timeline

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Database schema & settings | ✅ Complete |
| 2 | Org settings API | 🔄 In Progress |
| 3 | K8s operator development | 📋 Planned |
| 4 | Connection pool manager | 📋 Planned |
| 5 | Migration tools | 📋 Planned |
| 6 | Admin UI | 📋 Planned |
