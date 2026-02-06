# Import/Export Workflow

Data import and export workflow for Oikion's real estate data — CSV, XML, Excel, and portal publishing.

## When to Use

- Implementing new import functionality for client/property data
- Adding new export formats
- Integrating with property portals (XE.gr, Spitogatos)
- Debugging import/export issues

## Key Directories

- `lib/export/` — Export functionality (Excel, PDF, XML, portals)
- `lib/import/` — Import schemas and normalizers
- `public/templates/` — Sample import templates (CSV, XML)
- `lib/portal-publishing/` — Portal integration logic
- `lib/xe/` — XE.gr client library

## Import Workflow

### Step 1: Define Import Schema

Create or update import schema in `lib/import/`:

```typescript
// Define expected columns/fields
const importSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // ... map to Prisma model fields
});
```

### Step 2: Implement Normalizer

Create a normalizer that transforms raw import data to match the schema:
- Handle different date formats
- Normalize phone numbers
- Map column headers to internal field names
- Handle Greek/English column names

### Step 3: Batch Processing

For large imports:
- Process in batches (50-100 records per batch)
- Track progress with `BackgroundJob` model
- Report errors per row (don't fail entire import)
- Use `prismadb.$transaction()` for atomicity per batch
- Always include `organizationId` in every created record

### Step 4: Validation and Error Reporting

```typescript
const results = {
  total: rows.length,
  success: 0,
  failed: 0,
  errors: [] as { row: number; field: string; message: string }[],
};
```

Return detailed error report with row numbers and field-level errors.

## Export Workflow

### Supported Formats

- **Excel** (.xlsx) — Primary export format for lists
- **PDF** — Property brochures, reports
- **XML** — Portal feeds (XE.gr format)
- **CSV** — Simple data export

### Export Pattern

```typescript
import { exportToExcel } from "@/lib/export";

// Query data with tenant isolation
const organizationId = await getCurrentOrgId();
const data = await prismadb.properties.findMany({
  where: { organizationId, status: "ACTIVE" },
});

// Transform and export
const buffer = await exportToExcel(data, columns, options);
```

### Portal Publishing (XE.gr)

Portal publishing uses the XE integration:
1. `lib/xe/` — XE.gr API client
2. `lib/portal-publishing/` — Publishing orchestration
3. `actions/xe/` — Server actions for XE operations

Workflow:
1. Select properties for publishing
2. Validate required portal fields (photos, description, price, location)
3. Transform to portal format (XML feed)
4. Publish via XE.gr API
5. Track sync status per property

## Sample Templates

Reference templates in `public/templates/`:
- `sample_clients.xml` — Client import template
- `sample_properties.csv` — Property CSV import
- `sample_properties.xml` — Property XML import

## Security Considerations

- Validate file type and size BEFORE processing
- Scan for malicious content in uploaded files
- Never execute formulas from CSV/Excel files
- Sanitize all imported string data
- Always apply `organizationId` to imported records — never trust import data for tenant context
