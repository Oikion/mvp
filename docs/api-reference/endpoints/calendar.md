# Calendar API

Base path: `/api/v1/calendar/events`

## Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/calendar/events` | `calendar:read` | List events |
| POST | `/api/v1/calendar/events` | `calendar:write` | Create event |
| GET | `/api/v1/calendar/events/{id}` | `calendar:read` | Get event |
| PUT | `/api/v1/calendar/events/{id}` | `calendar:write` | Update event |
| DELETE | `/api/v1/calendar/events/{id}` | `calendar:write` | Cancel event |
| GET | `/api/v1/calendar/events/upcoming` | `calendar:read` | Get upcoming events |

## GET /api/v1/calendar/events

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Items per page (default: 50, max: 100) |
| `cursor` | string | Pagination cursor |
| `startTime` | ISO 8601 | Filter events starting at or after this time |
| `endTime` | ISO 8601 | Filter events starting at or before this time |
| `status` | string | Filter by event status (e.g., `scheduled`, `cancelled`) |
| `eventType` | string | Filter by event type |

### Response

```json
{
  "data": {
    "events": [
      {
        "id": "clxxx",
        "title": "Property Viewing - Κολωνάκι",
        "description": "Viewing with Papadopoulos family",
        "startTime": "2026-03-21T10:00:00.000Z",
        "endTime": "2026-03-21T11:00:00.000Z",
        "location": "Σκουφά 10, Αθήνα",
        "status": "scheduled",
        "eventType": "VIEWING",
        "assignedUserId": "user_xxx",
        "linkedClients": [{ "id": "clyyy", "client_name": "Γιώργης Παπαδόπουλος" }],
        "linkedProperties": [{ "id": "clzzz", "property_name": "Διαμέρισμα Κολωνάκι" }],
        "createdAt": "2026-03-20T08:00:00.000Z",
        "updatedAt": "2026-03-20T08:00:00.000Z"
      }
    ]
  },
  "meta": { "nextCursor": null, "hasMore": false, "limit": 50 },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## POST /api/v1/calendar/events

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Event title |
| `startTime` | ISO 8601 | **Yes** | Start date/time |
| `endTime` | ISO 8601 | **Yes** | End date/time (must be after startTime) |
| `description` | string | No | Event description |
| `location` | string | No | Location string |
| `eventType` | string | No | Event type enum |
| `assignedUserId` | string | No | Assigned user ID |
| `clientIds` | string[] | No | Client IDs to link (must belong to your org) |
| `propertyIds` | string[] | No | Property IDs to link (must belong to your org) |

### Response (201)

```json
{
  "data": {
    "event": {
      "id": "clxxx",
      "title": "Property Viewing - Κολωνάκι",
      "description": null,
      "startTime": "2026-03-21T10:00:00.000Z",
      "endTime": "2026-03-21T11:00:00.000Z",
      "location": "Σκουφά 10, Αθήνα",
      "status": "scheduled",
      "eventType": "VIEWING",
      "assignedUserId": "user_xxx",
      "createdAt": "2026-03-20T10:00:00.000Z"
    }
  },
  "timestamp": "2026-03-20T10:00:00.000Z"
}
```

## GET /api/v1/calendar/events/{id}

Path parameter `{id}` is the event's **friendly ID**.

Returns full event detail including linked clients, properties, and documents.

## PUT /api/v1/calendar/events/{id}

Same body fields as POST. All fields optional (partial update).

## DELETE /api/v1/calendar/events/{id}

Sets event status to `cancelled`. Dispatches `calendar.event.cancelled` webhook.

## GET /api/v1/calendar/events/upcoming

Returns the next N upcoming events (ordered by `startTime` ascending) for the organization. Accepts `limit` query parameter.
