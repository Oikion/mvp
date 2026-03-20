# Database Migrations

Oikion uses Prisma Migrate with PostgreSQL (Prisma Postgres hosting). All schema changes must go through migration files — `prisma db push` is forbidden in production.

## Migration Workflow

```bash
# 1. Modify prisma/schema.prisma
# 2. Create and apply migration locally
pnpm db:migrate   # alias for: prisma migrate dev --name <name>

# 3. Verify
pnpm prisma studio

# 4. Deploy to production
pnpm db:deploy    # alias for: prisma migrate deploy
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Create + apply migration in dev |
| `pnpm db:deploy` | Deploy pending migrations to production |
| `pnpm db:status` | Check migration status |
| `pnpm db:validate` | Validate migrations and git state |
| `pnpm prisma generate` | Regenerate Prisma client after schema changes |

### Special Cases

**Non-transactional migrations** (PostgreSQL enum ADD VALUE): wrap in `-- migration.sql` with `BEGIN/COMMIT` removed, as `ADD VALUE` cannot run inside a transaction. See `20260313180050_add_hidden_to_item_visibility`.

**Enum renaming**: PostgreSQL `ALTER TYPE ... RENAME VALUE` renames in-place with no data migration needed. See `20260313190000_rename_personal_to_private`.

**Nullable columns**: Use `String?` in schema. Migration generates `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL`.

## Past Migrations

### 2026-03-13: Add HIDDEN to ItemVisibility

**File:** `20260313180050_add_hidden_to_item_visibility`
**Type:** Non-transactional (ADD VALUE)

Added `HIDDEN` value to `ItemVisibility` enum. Non-transactional because PostgreSQL does not allow `ADD VALUE` inside a transaction block.

---

### 2026-03-13: Rename PERSONAL to PRIVATE

**File:** `20260313190000_rename_personal_to_private`

Renamed `ItemVisibility.PERSONAL` → `PRIVATE`. PostgreSQL renames in-place; no row updates required.

---

### 2026-03-11: Phase A — Entity Relationships

**File:** `20260311124134_phase_a_entity_relationships`

- 18 fields changed `String` → `String?` (nullable)
- 31 relations set to `onDelete: SetNull`
- Added `DepartureReason` enum
- Added 11 database indexes

---

### 2026-03-08: Remove Mandate Fields from Client

**File:** `20260308092331_remove_mandate_fields_from_client`

Removed 10 mandate-related fields from `Client` model and 2 enums (`ClientIntent`, `FinancingType`).

---

### 2026-02-01: CalComEvent → CalendarEvent Rename

**File:** `20260201000000_rename_calcom_to_calendar_event`

Renamed table, columns, and junction table to remove Cal.com vendor naming.

**Breaking changes for API consumers:**
- Field `calcomEventId` → `calendarEventId`
- Field `calcomUserId` → `calendarUserId`
- Table `CalComEvent` → `CalendarEvent`

---

### AI Provider Settings

Added three fields to `OrganizationSettings` for per-org AI configuration:

| Field | Type | Default |
|-------|------|---------|
| `aiProvider` | `TEXT` | `"openai"` |
| `anthropicApiKey` | `TEXT` | `NULL` (encrypted) |
| `anthropicModel` | `TEXT` | `"claude-3-5-sonnet-20241022"` |

**Manual SQL (if Prisma migrate fails):**
```sql
ALTER TABLE "OrganizationSettings"
ADD COLUMN IF NOT EXISTS "aiProvider" TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS "anthropicApiKey" TEXT,
ADD COLUMN IF NOT EXISTS "anthropicModel" TEXT DEFAULT 'claude-3-5-sonnet-20241022';
```

**Rollback:**
```sql
ALTER TABLE "OrganizationSettings"
DROP COLUMN IF EXISTS "aiProvider",
DROP COLUMN IF EXISTS "anthropicApiKey",
DROP COLUMN IF EXISTS "anthropicModel";
```

## Rollback Approach

Prisma does not support automatic rollbacks. For each migration, document the reverse SQL in the migration doc before applying. For the CalendarEvent rename example:

```sql
ALTER TABLE "CalendarEvent" RENAME TO "CalComEvent";
ALTER TABLE "CalComEvent" RENAME COLUMN "calendarEventId" TO "calcomEventId";
-- etc.
```

After reversing SQL, run `pnpm prisma generate` and rebuild.

## Production Safety Checklist

- [ ] Migration tested in dev environment
- [ ] Reverse SQL documented
- [ ] Database backup taken before applying
- [ ] `pnpm db:validate` passes
- [ ] Prisma client regenerated (`pnpm prisma generate`)
- [ ] Application build succeeds (`pnpm build`)
- [ ] Staging validated before production
