# Permissions

## Role hierarchy

```
org:owner > org:lead > org:member > org:viewer
```

| Clerk Role Key | Display Name | Description |
|----------------|-------------|-------------|
| `org:owner` | Owner | Full access, primary org administrator |
| `org:lead` | Lead | Full CRUD on all entities; can invite members |
| `org:member` | Member | Standard CRUD; cannot reassign agents or invite users |
| `org:viewer` | Viewer | Read-only on permitted modules |

Roles must be created in Clerk Dashboard → Organization Settings → Roles with exactly these key values. Default for new members: `org:member`.

## Permission levels

Within the permission system (`lib/permissions/`), access is expressed as:

| Level | Meaning |
|-------|---------|
| `none` | No access to this resource |
| `own` | Can act on records assigned to self |
| `all` | Can act on all records in the org |

## Checking permissions

```typescript
import { getPermissionContext } from "@/lib/permissions";

const { can } = await getPermissionContext(organizationId, userId);

if (!can("clients", "write", "all")) {
  return { error: "Forbidden" };
}
```

## Key files

| File | Purpose |
|------|---------|
| `lib/permissions/` | Permission context and `can()` helper |
| `lib/org-admin.ts` | Role-checking utilities (`isOrgOwner`, `isOrgLead`, etc.) |
| `app/[locale]/app/(routes)/admin/roles/` | Role management UI |

## Platform admin access

Platform admins have access to `(platform_admin)` routes which are invisible to regular users. Platform admin status is checked via:

1. `isPlatformAdmin: true` in Clerk `privateMetadata` for the user, **or**
2. User email in `PLATFORM_ADMIN_EMAILS` environment variable (comma-separated)

```typescript
import { isPlatformAdmin } from "@/lib/permissions";

const admin = await isPlatformAdmin(userId);
```

Platform admin routes are protected in `proxy.ts` middleware.

## Adding new permissions

1. Add the new resource/action to the permission matrix in `lib/permissions/`
2. Apply `can()` checks in the relevant server actions and API routes
3. Update UI to reflect access levels (hide/disable elements for unauthorized roles)
4. Add translations for any new error messages in `locales/en/` and `locales/el/`

## Permission caching

Permission context is cached in Redis under `oik:perm:{orgId}:{userId}` (2-minute TTL) with a version counter at `oik:perm:ver:{orgId}` (1-hour TTL). Role changes invalidate the version counter, causing cache misses on the next request.
