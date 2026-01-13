# Oikion External API Documentation

## Overview

The Oikion External API allows you to integrate with external tools like n8n, Make.com, Zapier, and custom webhooks. This API provides secure access to Calendar, CRM, MLS (Properties), Tasks, and Documents modules.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication using an API key. Include your API key in the `Authorization` header:

```http
Authorization: Bearer oik_your_api_key_here
```

### Creating API Keys

1. Navigate to **Admin → API Keys** in the Oikion dashboard
2. Click **Create API Key**
3. Enter a name and select the required permissions (scopes)
4. Copy the generated key - it will only be shown once!

### Available Scopes

| Scope | Description |
|-------|-------------|
| `calendar:read` | View calendar events and schedules |
| `calendar:write` | Create, update, and delete calendar events |
| `crm:read` | View clients, contacts, and CRM data |
| `crm:write` | Create, update, and delete clients and contacts |
| `mls:read` | View properties and MLS listings |
| `mls:write` | Create, update, and delete properties |
| `tasks:read` | View tasks and assignments |
| `tasks:write` | Create, update, and complete tasks |
| `documents:read` | View and download documents |
| `documents:write` | Upload and manage documents |
| `webhooks:manage` | Configure webhook endpoints |

## Rate Limiting

API requests are limited to **100 requests per minute** per API key. Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200000
```

## Response Format

All responses follow a consistent JSON format:

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "nextCursor": "abc123",
    "hasMore": true,
    "limit": 50
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Pagination

List endpoints support cursor-based pagination:

```http
GET /api/v1/crm/clients?limit=50&cursor=abc123
```

| Parameter | Description |
|-----------|-------------|
| `limit` | Number of items per page (default: 50, max: 100) |
| `cursor` | Cursor from previous response for next page |

## Endpoints

### Calendar Events

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/calendar/events` | calendar:read | List events |
| POST | `/calendar/events` | calendar:write | Create event |
| GET | `/calendar/events/{id}` | calendar:read | Get event |
| PUT | `/calendar/events/{id}` | calendar:write | Update event |
| DELETE | `/calendar/events/{id}` | calendar:write | Cancel event |

### CRM Clients

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/crm/clients` | crm:read | List clients |
| POST | `/crm/clients` | crm:write | Create client |
| GET | `/crm/clients/{id}` | crm:read | Get client |
| PUT | `/crm/clients/{id}` | crm:write | Update client |
| DELETE | `/crm/clients/{id}` | crm:write | Delete client |

### CRM Tasks

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/crm/tasks` | tasks:read | List tasks |
| POST | `/crm/tasks` | tasks:write | Create task |
| GET | `/crm/tasks/{id}` | tasks:read | Get task |
| PUT | `/crm/tasks/{id}` | tasks:write | Update task |
| DELETE | `/crm/tasks/{id}` | tasks:write | Delete task |

### MLS Properties

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/mls/properties` | mls:read | List properties |
| POST | `/mls/properties` | mls:write | Create property |
| GET | `/mls/properties/{id}` | mls:read | Get property |
| PUT | `/mls/properties/{id}` | mls:write | Update property |
| DELETE | `/mls/properties/{id}` | mls:write | Delete property |

### Documents

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/documents` | documents:read | List documents |
| POST | `/documents` | documents:write | Create document record |
| GET | `/documents/{id}` | documents:read | Get document |
| PUT | `/documents/{id}` | documents:write | Update document |
| DELETE | `/documents/{id}` | documents:write | Delete document |

### Webhooks

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| GET | `/webhooks` | webhooks:manage | List webhook endpoints |
| POST | `/webhooks` | webhooks:manage | Create webhook endpoint |
| GET | `/webhooks/{id}` | webhooks:manage | Get webhook with deliveries |
| PUT | `/webhooks/{id}` | webhooks:manage | Update webhook endpoint |
| DELETE | `/webhooks/{id}` | webhooks:manage | Delete webhook endpoint |

## Webhooks (Outgoing)

Configure webhooks to receive real-time notifications when events occur in Oikion.

### Available Events

| Event | Description |
|-------|-------------|
| `client.created` | New client created |
| `client.updated` | Client updated |
| `client.deleted` | Client deleted |
| `property.created` | New property created |
| `property.updated` | Property updated |
| `property.deleted` | Property deleted |
| `task.created` | New task created |
| `task.updated` | Task updated |
| `task.completed` | Task marked complete |
| `task.deleted` | Task deleted |
| `calendar.event.created` | Calendar event created |
| `calendar.event.updated` | Calendar event updated |
| `calendar.event.cancelled` | Calendar event cancelled |
| `document.uploaded` | Document uploaded |
| `document.shared` | Document shared |
| `document.deleted` | Document deleted |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "event": "client.created",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "organizationId": "org_xyz789",
  "data": {
    "client": {
      "id": "CLI-001",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "ACTIVE"
    }
  }
}
```

### Webhook Headers

```http
Content-Type: application/json
X-Webhook-Signature: abc123...
X-Webhook-Timestamp: 1704067200
X-Webhook-Event: client.created
X-Webhook-Delivery-Id: del_xyz789
User-Agent: Oikion-Webhooks/1.0
```

### Verifying Webhook Signatures

Webhooks are signed using HMAC-SHA256. To verify:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## Examples

See the following guides for integration examples:
- [n8n Integration Guide](./n8n-integration.md)
- [Make.com Integration Guide](./make-integration.md)
