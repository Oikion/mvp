# xe.gr Portal Publishing

This guide documents the xe.gr Bulk Import Tool (BIT) API integration used by the Oikion portal publishing system.

## Prerequisites

- xe.gr BIT API credentials (username/password, and authtoken if provided).
- A ZIP package that follows xe.gr Unified Ad Format (XML + digital assets).
- Oikion user with organization context (required by the API route).

## Environment variables

Set the following server-side variables:

```
XE_GR_USERNAME="your_xe_gr_username"
XE_GR_PASSWORD="your_xe_gr_password"
XE_GR_AUTHTOKEN="optional_auth_token_if_required"
XE_GR_BASE_URL="http://import.xe.gr"
```

## Internal API endpoint

Oikion exposes a single endpoint that forwards your ZIP to xe.gr:

```
POST /api/portal-publishing/xe-gr
```

### Required fields

- `file`: The ZIP file (Unified Ad Format XML + assets)
- `action`: `add` or `remove` (optional; defaults to `add`)

### Example request

```bash
curl -X POST "https://your-domain.com/api/portal-publishing/xe-gr?action=add" \
  -F "file=@/path/to/xe-package.zip" \
  -F "action=add"
```

### Response

The API returns the xe.gr response body as plain text inside JSON:

```json
{
  "action": "add",
  "status": 200,
  "ok": true,
  "response": "...xe.gr response..."
}
```

## Notes

- Use `action=remove` when you need to delete listings.
- If xe.gr returns validation errors, inspect the `response` string to fix your XML or assets.
- Configure `XE_GR_BASE_URL` for testing vs production environments when xe.gr provides separate endpoints.
