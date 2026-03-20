# Import/Export Guide

CSV, XML, and Excel import; portal publishing; and export formats.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `lib/export/` | Export logic (Excel, PDF, XML, portals) |
| `lib/import/` | Import schemas and normalizers |
| `lib/import/enum-normalizer.ts` | Maps human-readable strings to Prisma enum values |
| `public/templates/` | Sample import templates (`sample_clients.xml`, `sample_properties.csv`, `sample_properties.xml`) |
| `lib/portal-publishing/` | Portal publishing orchestration |
| `lib/xe/` | XE.gr API client |
| `actions/xe/` | Server actions for XE operations |

## Import Workflow

### 1. Define Schema

Create or update a Zod schema in `lib/import/` mapping raw columns to Prisma fields:

```typescript
const importSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})
```

### 2. Normalize Raw Data

Use `lib/import/enum-normalizer.ts` to convert human-readable values:

```typescript
// Visibility normalization examples:
// "hidden" → "HIDDEN"
// "private" → "PRIVATE"
// "personal" → "PRIVATE"  (backward compat)
```

Also handle: different date formats, phone normalization, Greek/English column headers.

### 3. Batch Processing

For large imports (50–100 records per batch):

```typescript
const results = { total: rows.length, success: 0, failed: 0, errors: [] }

for (const batch of chunks(rows, 50)) {
  await prismadb.$transaction(async (tx) => {
    for (const row of batch) {
      try {
        await tx.client.create({
          data: { ...normalizedRow, organizationId }  // always inject org
        })
        results.success++
      } catch (err) {
        results.errors.push({ row: row.index, field: '...', message: String(err) })
        results.failed++
      }
    }
  })
}
```

Track long-running imports with the `BackgroundJob` model.

### 4. Error Reporting

Return row-level errors — never fail the entire import on a single bad row:

```typescript
{ row: 42, field: 'email', message: 'Invalid email format' }
```

## Export Workflow

### Supported Formats

| Format | Use |
|--------|-----|
| `.xlsx` | Primary list export |
| `.pdf` | Property brochures, financial reports |
| `.xml` | Portal feeds (XE.gr) |
| `.csv` | Simple data export |

### Export Pattern

```typescript
import { exportToExcel } from '@/lib/export'

const organizationId = await getCurrentOrgId()
const data = await prismadb.properties.findMany({
  where: { organizationId, status: 'ACTIVE' }
})
const buffer = await exportToExcel(data, columns, options)
```

## Portal Publishing (XE.gr)

See [Portal Publishing Guide](../portal-publishing/index.md) for the full xe.gr workflow.

Quick reference:
1. Select properties
2. Validate required fields (photos, description, price, location)
3. Transform to Unified Ad Format XML
4. `POST /api/portal-publishing/xe-gr` (action: `add` | `remove`)
5. Track sync status per property

Credentials: `XE_GR_*` environment variables (see `docs/operations/credential-rotation.md`).

## Security Rules

- Validate file type and MIME before processing
- Scan for malicious content in uploads
- Never execute formulas from CSV/Excel (formula injection)
- Sanitize all imported strings
- Always inject `organizationId` server-side — never trust import data for tenant context
- File size limit: enforce before parsing to prevent memory exhaustion

## enum-normalizer Reference

`lib/import/enum-normalizer.ts` maps commonly used synonyms. When adding a new import format, extend the normalizer rather than adding ad-hoc mapping logic inline.

## Related

- [Portal Publishing](../portal-publishing/index.md)
- [MLS Guide](../mls/index.md)
- [CRM Guide](../crm/index.md)
