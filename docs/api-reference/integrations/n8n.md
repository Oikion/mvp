# n8n Integration Guide

This guide shows how to integrate Oikion with n8n for workflow automation.

## Prerequisites

1. An Oikion account with admin access
2. An n8n instance (self-hosted or n8n.cloud)
3. An API key from Oikion with appropriate scopes

## Creating an API Key

1. Log in to Oikion as an admin
2. Navigate to **Admin → API Keys**
3. Click **Create API Key**, name it "n8n Integration"
4. Select required scopes (`crm:read/write`, `calendar:read/write`, `mls:read/write`, `tasks:read/write`)
5. Copy the generated API key

## HTTP Request Node Configuration

For all Oikion API calls, use the **HTTP Request** node:

- Authentication: Header Auth
- Name: `Authorization`
- Value: `Bearer oik_your_api_key_here`
- Base URL: `https://your-oikion-domain.com/api/v1`

## Example Workflows

### 1. Sync New Leads from External Form

```
[Webhook Trigger] → [HTTP Request: POST /crm/clients] → [Slack Notification]
```

Request body:
```json
{
  "name": "{{ $json.name }}",
  "email": "{{ $json.email }}",
  "phone": "{{ $json.phone }}",
  "status": "LEAD",
  "leadSource": "WEB"
}
```

### 2. Create Task When Client Status Changes

1. In n8n, create a Webhook trigger node and copy the URL
2. Create an Oikion webhook:

```bash
curl -X POST "https://your-domain.com/api/v1/webhooks" \
  -H "Authorization: Bearer oik_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "n8n Client Updates", "url": "https://your-n8n.com/webhook/abc123", "events": ["client.updated"]}'
```

Workflow: `[Webhook Trigger] → [IF: Status = ACTIVE] → [HTTP Request: POST /crm/tasks]`

### 3. Sync Calendar Events to Google Calendar

```
[Schedule Trigger] → [HTTP Request: GET /calendar/events] → [Loop] → [Google Calendar: Create Event]
```

GET query params:
- `startTime`: `{{ $now.toISO() }}`
- `endTime`: `{{ $now.plus({ days: 7 }).toISO() }}`

### 4. Property Listing Automation

1. Create a webhook in Oikion for `property.created` pointing to your n8n URL
2. Workflow: `[Webhook Trigger] → [Set: Format Message] → [Twitter/Facebook: Post]`

## Error Handling

```javascript
// Check response
if ($json.error) throw new Error($json.error);

// Handle rate limiting (429)
if ($response.statusCode === 429) {
  const retryAfter = $response.headers['retry-after'] || 60;
  await new Promise(r => setTimeout(r, retryAfter * 1000));
}
```

## Best Practices

1. **Paginate large datasets:**
   ```javascript
   let allItems = [];
   let cursor = null;
   do {
     const response = await fetch(url + (cursor ? `?cursor=${cursor}` : ''));
     const data = await response.json();
     allItems = [...allItems, ...data.data.items];
     cursor = data.meta.nextCursor;
   } while (data.meta.hasMore);
   ```

2. **Prevent duplicates** using `X-Webhook-Delivery-Id`
3. **Verify webhook signatures** in production
4. **Request only needed scopes**

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Invalid/revoked key | Check `Bearer oik_...` format |
| 403 Forbidden | Missing scope | Add required scope to API key |
| 429 Too Many Requests | Rate limit exceeded | Implement exponential backoff |
| Webhook not firing | URL not accessible | Verify n8n is internet-accessible and webhook is active |
