# Oikion External API

## Overview

The Oikion External API provides programmatic access to Calendar, CRM, MLS, Tasks, and Documents. Integrate with n8n, Make.com, Zapier, or any HTTP client.

**Base URL:** `https://your-domain.com/api/v1`

## Authentication

All requests require an API key in the `Authorization` header:

```http
Authorization: Bearer oik_your_api_key_here
```

Create keys at **Admin → API Keys**. Keys are shown only once on creation.

## Scopes

| Scope | Description |
|-------|-------------|
| `calendar:read` | View calendar events |
| `calendar:write` | Create, update, delete calendar events |
| `crm:read` | View clients and CRM data |
| `crm:write` | Create, update, delete clients |
| `mls:read` | View properties |
| `mls:write` | Create, update, delete properties |
| `tasks:read` | View tasks |
| `tasks:write` | Create, update, delete tasks |
| `documents:read` | View documents |
| `documents:write` | Manage documents |
| `webhooks:manage` | Configure webhooks |

## Rate Limiting

100 requests per minute per API key.

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200000
```

## Response Format

```json
{
  "data": { ... },
  "meta": { "nextCursor": "abc123", "hasMore": true, "limit": 50 },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Error responses:

```json
{
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Pagination

Cursor-based pagination on all list endpoints:

```
GET /api/v1/crm/clients?limit=50&cursor=abc123
```

| Parameter | Default | Max |
|-----------|---------|-----|
| `limit` | 50 | 100 |
| `cursor` | — | — |

## Endpoints

- [Properties](./endpoints/properties.md) — `mls:read` / `mls:write`
- [Clients](./endpoints/clients.md) — `crm:read` / `crm:write`
- [Mandates](./endpoints/mandates.md) — planned
- [Calendar](./endpoints/calendar.md) — `calendar:read` / `calendar:write`

## Integrations

- [n8n](./integrations/n8n.md)
- [Make.com](./integrations/make.md)

## Webhooks (Outgoing)

Configure at `POST /api/v1/webhooks`. Events: `client.created`, `client.updated`, `client.deleted`, `property.created`, `property.updated`, `property.deleted`, `task.created`, `task.updated`, `task.completed`, `task.deleted`, `calendar.event.created`, `calendar.event.updated`, `calendar.event.cancelled`, `document.uploaded`, `document.shared`, `document.deleted`.

Payloads are HMAC-SHA256 signed. Verify:

```javascript
const signedPayload = `${timestamp}.${rawBody}`;
const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
return signature === expected;
```
