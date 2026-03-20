# Properties API

Base path: `/api/v1/mls/properties`

## Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/mls/properties` | `mls:read` | List properties |
| POST | `/api/v1/mls/properties` | `mls:write` | Create property |
| GET | `/api/v1/mls/properties/{id}` | `mls:read` | Get property by friendly ID |
| PUT | `/api/v1/mls/properties/{id}` | `mls:write` | Update property |
| DELETE | `/api/v1/mls/properties/{id}` | `mls:write` | Delete property |

## GET /api/v1/mls/properties

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Items per page (default: 50, max: 100) |
| `cursor` | string | Pagination cursor from previous response |
| `status` | string | Filter by `property_status` |
| `type` | string | Filter by `property_type` |
| `transactionType` | string | Filter by `transaction_type` |
| `assignedTo` | string | Filter by assigned user ID |
| `search` | string | Search `name`, `address_city`, `address_street` |
| `minPrice` | integer | Minimum price filter |
| `maxPrice` | integer | Maximum price filter |

### Response

```json
{
  "data": {
    "properties": [
      {
        "id": "clxxx",
        "name": "Διαμέρισμα Κολωνάκι",
        "type": "APARTMENT",
        "status": "ACTIVE",
        "transactionType": "SALE",
        "price": 350000,
        "priceType": "FIXED",
        "address": {
          "street": "Σκουφά 10",
          "city": "Αθήνα",
          "state": "Αττική",
          "zip": "10673"
        },
        "bedrooms": 2,
        "bathrooms": 1,
        "sizeNetSqm": 85,
        "assignedTo": { "id": "user_xxx", "name": "Άννα Παπαδάκη", "email": "anna@example.com" },
        "createdAt": "2026-01-01T12:00:00.000Z",
        "updatedAt": "2026-01-15T09:00:00.000Z"
      }
    ]
  },
  "meta": { "nextCursor": "clyyy", "hasMore": true, "limit": 50 },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## POST /api/v1/mls/properties

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Property name |
| `type` | string | No | Property type enum |
| `status` | string | No | Default: `ACTIVE` |
| `transactionType` | string | No | `SALE` or `RENT` |
| `price` | number | No | Price in EUR |
| `priceType` | string | No | `FIXED`, `NEGOTIABLE`, etc. |
| `addressStreet` | string | No | Street address |
| `addressCity` | string | No | City |
| `addressState` | string | No | Region/state |
| `addressZip` | string | No | Postal code |
| `bedrooms` | integer | No | Bedroom count |
| `bathrooms` | integer | No | Bathroom count |
| `sizeNetSqm` | number | No | Net area in sqm |
| `sizeGrossSqm` | number | No | Gross area in sqm |
| `floor` | integer | No | Floor number |
| `floorsTotal` | integer | No | Total floors in building |
| `yearBuilt` | integer | No | Construction year |
| `condition` | string | No | Property condition enum |
| `heatingType` | string | No | Heating type enum |
| `energyCertClass` | string | No | Energy class (A+, A, B, ...) |
| `elevator` | boolean | No | Has elevator |
| `amenities` | string[] | No | Amenity list |
| `description` | string | No | Description |
| `assignedTo` | string | No | Assigned user ID |
| `isExclusive` | boolean | No | Exclusive mandate |
| `portalVisibility` | string | No | `HIDDEN`, `PRIVATE` (default), `SECURE`, or `PUBLIC` |

### Response (201)

```json
{
  "data": {
    "property": {
      "id": "clxxx",
      "name": "Διαμέρισμα Κολωνάκι",
      "type": "APARTMENT",
      "status": "ACTIVE",
      "transactionType": "SALE",
      "price": 350000,
      "assignedTo": null,
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## GET /api/v1/mls/properties/{id}

Path parameter `{id}` is the property's **friendly ID** (e.g., `PRO-0042`).

Returns full property detail including all fields, linked mandates, and assigned agent.

## PUT /api/v1/mls/properties/{id}

Same body fields as POST. All fields optional (partial update).

## DELETE /api/v1/mls/properties/{id}

Returns 204 on success. Dispatches `property.deleted` webhook event.

## Visibility Values

| Value | Description |
|-------|-------------|
| `HIDDEN` | Excluded from all automated systems (matchmaking, analytics) |
| `PRIVATE` | Agency-only; participates in intra-org matchmaking |
| `SECURE` | Shared within app (bilateral + cross-org matching) |
| `PUBLIC` | Shared + showcased on public agent profile |
