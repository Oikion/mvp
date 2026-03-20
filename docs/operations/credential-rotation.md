# Phase 1.4 - Security: Credential Rotation

## Problem Statement

**Severity:** 🔴 CRITICAL SECURITY ISSUE  
**Impact:** Exposed credentials, potential data breach  
**Affected Files:** `.env.local`, Vercel environment variables

### Current Issue

During the codebase analysis, exposed credentials were detected in the `.env.local` file (line 17). This is a critical security vulnerability that requires immediate action:

1. **Exposed Database URL** - Contains credentials visible in repository
2. **Potential Unauthorized Access** - Anyone with access to the file can connect to database
3. **Compliance Risk** - Violates security best practices and compliance requirements
4. **Data Breach Risk** - Exposed credentials could lead to data theft or manipulation

### Evidence

```bash
# .env.local (line 17) - EXPOSED CREDENTIALS
DATABASE_URL="postgres://f3074c1c282b0fd38b43169f4d8c2320b7112ed2e9cb07b9285d65ec9488219c:sk__8LepGjFPdEwbtjBnlYcJ@db.prisma.io:5432/postgres?sslmode=require"
```

**Security Implications:**
- ❌ Database credentials exposed
- ❌ Connection string visible in plain text
- ❌ Potential for unauthorized database access
- ❌ Risk of data exfiltration or manipulation

## Solution

### Immediate Actions (Within 1 Hour)

#### Step 1: Rotate Database Credentials

**For Prisma Postgres:**
```bash
# 1. Log into Prisma Data Platform (console.prisma.io)
# 2. Navigate to your project / database
# 3. Go to Settings → Connection or Credentials
# 4. Rotate password or regenerate connection string
# 5. Copy new connection string
```

**For Prisma Accelerate:**
```bash
# 1. Log into Prisma Data Platform
# 2. Navigate to your project
# 3. Go to Settings → API Keys
# 4. Click "Regenerate API Key"
# 5. Copy new connection string
```

**For Other Providers:**
```bash
# Follow provider-specific credential rotation process
# Most providers offer password reset in dashboard
```

#### Step 2: Update Environment Variables

**Local Development:**
```bash
# Update .env.local with NEW credentials
DATABASE_URL="postgres://NEW_USER:NEW_PASSWORD@host/db?sslmode=require"

# Verify .env.local is in .gitignore
grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore

# Remove from git history if committed
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all
```

**Vercel Production:**
```bash
# Update via Vercel CLI
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production

# Or via Vercel Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Delete old DATABASE_URL
# 3. Add new DATABASE_URL
# 4. Redeploy application
```

#### Step 3: Verify Old Credentials Are Revoked

```bash
# Test old credentials (should fail)
psql "postgres://OLD_CREDENTIALS@host/db" -c "SELECT 1"
# Expected: connection refused or authentication failed

# Test new credentials (should succeed)
psql "postgres://NEW_CREDENTIALS@host/db" -c "SELECT 1"
# Expected: successful connection
```

### Long-Term Security Improvements

#### Step 4: Implement Secret Management

**Option A: Use Vercel Environment Variables (Recommended)**

```typescript
// lib/env.ts - NEW FILE
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  // Add all required env vars
});

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
}

// Call on app startup
// app/layout.tsx or middleware
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
```

**Option B: Use External Secret Manager**

```typescript
// lib/secrets.ts - For AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );
    
    return response.SecretString || '';
  } catch (error) {
    console.error('Failed to retrieve secret:', error);
    throw error;
  }
}

// Usage
const databaseUrl = await getSecret('oikion/database-url');
```

#### Step 5: Add Secret Scanning

**GitHub Secret Scanning:**
```yaml
# .github/workflows/secret-scan.yml
name: Secret Scanning

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pre-commit Hook:**
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for secrets in staged files
if git diff --cached --name-only | xargs grep -E "(sk_|pk_|api_key|password|secret)" 2>/dev/null; then
  echo "⚠️  WARNING: Potential secrets detected in commit"
  echo "Please review and remove sensitive data"
  exit 1
fi
```

#### Step 6: Implement Credential Rotation Policy

```typescript
// lib/credential-rotation.ts - NEW FILE
import { prismadb } from './prisma';

interface CredentialMetadata {
  name: string;
  lastRotated: Date;
  rotationIntervalDays: number;
}

export async function checkCredentialAge(credentials: CredentialMetadata[]) {
  const now = new Date();
  const warnings: string[] = [];
  
  credentials.forEach(cred => {
    const daysSinceRotation = Math.floor(
      (now.getTime() - cred.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceRotation > cred.rotationIntervalDays) {
      warnings.push(
        `⚠️  ${cred.name} is ${daysSinceRotation} days old (rotation interval: ${cred.rotationIntervalDays} days)`
      );
    }
  });
  
  if (warnings.length > 0) {
    console.warn('Credential Rotation Warnings:');
    warnings.forEach(w => console.warn(w));
  }
  
  return warnings;
}

// Run in monitoring script
const credentials = [
  { name: 'DATABASE_URL', lastRotated: new Date('2024-01-01'), rotationIntervalDays: 90 },
  { name: 'CLERK_SECRET_KEY', lastRotated: new Date('2024-01-01'), rotationIntervalDays: 180 },
  { name: 'RESEND_API_KEY', lastRotated: new Date('2024-01-01'), rotationIntervalDays: 90 },
];

checkCredentialAge(credentials);
```

## Implementation Steps

### Immediate (Within 1 Hour)

1. **Rotate Database Credentials**
   ```bash
   # Follow provider-specific process
   # Document old credentials for reference
   # Generate new credentials
   ```

2. **Update All Environments**
   ```bash
   # Local
   vi .env.local  # Update DATABASE_URL
   
   # Vercel Production
   vercel env rm DATABASE_URL production
   vercel env add DATABASE_URL production
   
   # Vercel Preview
   vercel env rm DATABASE_URL preview
   vercel env add DATABASE_URL preview
   ```

3. **Verify and Redeploy**
   ```bash
   # Test locally
   pnpm prisma db pull
   
   # Deploy to production
   vercel --prod
   
   # Verify deployment
   curl https://your-domain.com/api/health/db
   ```

4. **Revoke Old Credentials**
   ```bash
   # Verify old credentials no longer work
   # Document rotation in security log
   ```

### Short-Term (Within 24 Hours)

5. **Audit All Secrets**
   ```bash
   # List all environment variables
   grep -r "process.env" . --include="*.ts" --include="*.tsx" | \
     sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | \
     sort -u
   
   # Check which are in .env.local
   # Verify all are in Vercel environment variables
   ```

6. **Remove Secrets from Git History**
   ```bash
   # Use BFG Repo-Cleaner
   bfg --replace-text passwords.txt
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

7. **Add Secret Scanning**
   ```bash
   # Install pre-commit hooks
   pnpm add -D husky
   npx husky install
   npx husky add .husky/pre-commit "pnpm check-secrets"
   ```

### Long-Term (Within 1 Week)

8. **Implement Secret Management**
   ```bash
   # Choose secret management solution
   # Migrate all secrets to secure storage
   # Update deployment process
   ```

9. **Document Security Procedures**
   ```markdown
   # docs/security/credential-rotation.md
   - Rotation schedule
   - Rotation procedures
   - Emergency contacts
   - Incident response plan
   ```

10. **Set Up Monitoring**
    ```typescript
    // Add to monitoring dashboard
    // Alert on credential age
    // Track rotation compliance
    ```

## Verification

### Success Criteria
- ✅ All exposed credentials rotated
- ✅ Old credentials revoked and non-functional
- ✅ New credentials working in all environments
- ✅ .env.local in .gitignore
- ✅ No secrets in git history
- ✅ Secret scanning enabled
- ✅ Rotation policy documented

### Security Checklist
- [ ] Database credentials rotated
- [ ] Clerk API keys verified secure
- [ ] Resend API key checked
- [ ] AWS credentials (if any) rotated
- [ ] Vercel tokens verified
- [ ] .env.local not in git
- [ ] Git history cleaned
- [ ] Secret scanning active
- [ ] Team notified of rotation

### Testing

```bash
# Test 1: Verify old credentials don't work
psql "postgres://OLD_CREDS@host/db" -c "SELECT 1"
# Expected: Authentication failed

# Test 2: Verify new credentials work
psql "postgres://NEW_CREDS@host/db" -c "SELECT 1"
# Expected: Success

# Test 3: Check git history
git log --all --full-history --source -- .env.local
# Expected: No results

# Test 4: Verify production deployment
curl https://your-domain.com/api/health/db
# Expected: {"healthy": true}
```

## Rollback Plan

If issues occur with new credentials:

1. **Immediate Rollback** (if within rotation window)
   ```bash
   # Temporarily restore old credentials
   # Only if old credentials not yet revoked
   vercel env add DATABASE_URL_TEMP production
   # Update code to use DATABASE_URL_TEMP
   vercel --prod
   ```

2. **Fix Issues**
   ```bash
   # Identify connection problems
   # Check connection string format
   # Verify network access
   # Test credentials manually
   ```

3. **Retry Rotation**
   ```bash
   # Generate new credentials
   # Test thoroughly before deployment
   # Update all environments
   # Revoke old credentials
   ```

## Expected Impact

- ✅ **Security:** Eliminates critical credential exposure
- ✅ **Compliance:** Meets security best practices
- ✅ **Risk Reduction:** Prevents unauthorized access
- ✅ **Peace of Mind:** Credentials properly secured

## Additional Security Measures

### 1. Enable Database Firewall

```bash
# Prisma Postgres / Prisma Data Platform: Check project settings for IP allowlist if needed
# Prisma Accelerate: Already has built-in security
```

### 2. Enable Audit Logging

```typescript
// lib/audit-log.ts
import { prismadb } from './prisma';

export async function logSecurityEvent(event: {
  type: 'credential_rotation' | 'unauthorized_access' | 'suspicious_activity';
  details: string;
  userId?: string;
  ipAddress?: string;
}) {
  await prismadb.securityAuditLog.create({
    data: {
      ...event,
      timestamp: new Date(),
    },
  });
}
```

### 3. Implement Rate Limiting on Auth

```typescript
// Already implemented in lib/rate-limit.ts
// Verify strict limits on auth endpoints
const strictPaths = [
  '/api/auth',
  '/api/user/password',
  '/api/user/email',
];
```

### 4. Enable 2FA for Admin Accounts

```bash
# Clerk Dashboard → Security → Two-Factor Authentication
# Enable for all admin users
# Require for platform admin access
```

## Incident Response

If credentials are compromised:

1. **Immediate Actions** (Within 15 minutes)
   - Rotate all credentials immediately
   - Review access logs for unauthorized activity
   - Lock down affected systems
   - Notify security team

2. **Investigation** (Within 1 hour)
   - Determine scope of exposure
   - Identify affected systems
   - Check for data exfiltration
   - Document timeline

3. **Remediation** (Within 24 hours)
   - Implement additional security controls
   - Update security procedures
   - Conduct security training
   - Report to stakeholders

4. **Post-Incident** (Within 1 week)
   - Complete incident report
   - Update security policies
   - Implement preventive measures
   - Schedule security audit

## Next Steps

After completing this security fix:
1. ✅ Move to [Phase 1.5 - Data Serialization](./05-data-serialization.md)
2. Schedule regular credential rotation (quarterly)
3. Implement automated rotation for non-critical secrets
4. Conduct security audit

---

**Estimated Time:** 1-2 hours (immediate), 1 day (complete)  
**Difficulty:** Low-Medium  
**Risk Level:** Low (if done carefully)  
**Impact:** Critical (prevents security breaches)  
**Priority:** IMMEDIATE - Do this first!
