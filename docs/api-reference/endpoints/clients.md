# Clients API

Base path: `/api/v1/crm/clients`

## Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/crm/clients` | `crm:read` | List clients |
| POST | `/api/v1/crm/clients` | `crm:write` | Create client |
| GET | `/api/v1/crm/clients/{id}` | `crm:read` | Get client by friendly ID |
| PUT | `/api/v1/crm/clients/{id}` | `crm:write` | Update client |
| DELETE | `/api/v1/crm/clients/{id}` | `crm:write` | Delete client |

Note: Sensitive fields (`primary_email`, `primary_phone`, etc.) are encrypted server-side with a per-org DEK. The API decrypts them transparently before returning.

## GET /api/v1/crm/clients

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Items per page (default: 50, max: 100) |
| `cursor` | string | Pagination cursor |
| `status` | string | Filter by `client_status` (e.g., `LEAD`, `ACTIVE`) |
| `type` | string | Filter by `client_type` |
| `assignedTo` | string | Filter by assigned user ID |
| `search` | string | Search `name`, `primary_email`, `primary_phone` |

### Response

```json
{
  "data": {
    "clients": [
      {
        "id": "clxxx",
        "name": "Γιώργης Παπαδόπουλος",
        "email": "giorgos@example.com",
        "phone": "+30 210 1234567",
        "status": "LEAD",
        "type": "BUYER",
        "personType": "INDIVIDUAL",
        "assignedTo": { "id": "user_xxx", "name": "Άννα Παπαδάκη", "email": "anna@example.com" },
        "createdAt": "2026-01-01T12:00:00.000Z",
        "updatedAt": "2026-01-15T09:00:00.000Z"
      }
    ]
  },
  "meta": { "nextCursor": "clyyy", "hasMore": false, "limit": 50 },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## POST /api/v1/crm/clients

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Client display name |
| `email` | string | No | Primary email |
| `phone` | string | No | Primary phone |
| `secondaryEmail` | string | No | Secondary email |
| `secondaryPhone` | string | No | Secondary phone |
| `status` | string | No | Default: `LEAD` |
| `type` | string | No | `BUYER`, `SELLER`, `RENTER`, `INVESTOR`, `REFERRAL_PARTNER` |
| `personType` | string | No | `INDIVIDUAL` or `COMPANY` |
| `assignedTo` | string | No | Assigned user ID |
| `companyName` | string | No | Company name (for COMPANY type) |
| `fullName` | string | No | Legal full name |
| `language` | string | No | Preferred language code |
| `leadSource` | string | No | `WEB`, `REFERRAL`, `PORTAL`, etc. |
| `channels` | string[] | No | Preferred contact channels |
| `gdprConsent` | boolean | No | Default: `false` |
| `allowMarketing` | boolean | No | Default: `false` |
| `description` | string | No | Notes |
| `billingStreet` | string | No | Billing address street |
| `billingCity` | string | No | Billing city |
| `billingState` | string | No | Billing region |
| `billingPostalCode` | string | No | Billing postal code |
| `billingCountry` | string | No | Billing country |

### Response (201)

```json
{
  "data": {
    "client": {
      "id": "clxxx",
      "name": "Γιώργης Παπαδόπουλος",
      "email": "giorgos@example.com",
      "phone": "+30 210 1234567",
      "status": "LEAD",
      "type": "BUYER",
      "personType": "INDIVIDUAL",
      "assignedTo": null,
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## GET /api/v1/crm/clients/{id}

Path parameter `{id}` is the client's **friendly ID** (e.g., `CLI-0042`).

Returns full client detail including all address fields, linked mandates, and activity history.

## PUT /api/v1/crm/clients/{id}

Same body fields as POST. All fields optional (partial update).

## DELETE /api/v1/crm/clients/{id}

Returns 204 on success. Dispatches `client.deleted` webhook. Assigned references are set to null (not cascade deleted).
