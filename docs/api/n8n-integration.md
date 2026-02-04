# n8n Integration Guide

This guide shows how to integrate Oikion with n8n for workflow automation.

## Prerequisites

1. An Oikion account with admin access
2. An n8n instance (self-hosted or n8n.cloud)
3. An API key from Oikion with appropriate scopes

## Creating an API Key

1. Log in to Oikion as an admin
2. Navigate to **Admin → API Keys**
3. Click **Create API Key**
4. Name it "n8n Integration"
5. Select the scopes you need:
   - `crm:read`, `crm:write` for client operations
   - `calendar:read`, `calendar:write` for calendar operations
   - `mls:read`, `mls:write` for property operations
   - `tasks:read`, `tasks:write` for task operations
6. Copy the generated API key

## Setting Up n8n

### HTTP Request Node Configuration

For all Oikion API calls, use the **HTTP Request** node with these settings:

**Authentication:**
- Authentication: Header Auth
- Name: `Authorization`
- Value: `Bearer oik_your_api_key_here`

**Base URL:**
```
https://your-oikion-domain.com/api/v1
```

## Example Workflows

### 1. Sync New Leads from External Form

When a new lead comes in from a web form, create a client in Oikion.

```
[Webhook Trigger] → [HTTP Request: Create Client] → [Slack Notification]
```

**HTTP Request Node Settings:**
- Method: POST
- URL: `https://your-domain.com/api/v1/crm/clients`
- Body Content Type: JSON
- Body:

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

Use Oikion webhooks to trigger n8n when a client is updated.

**Setup Oikion Webhook:**
1. In n8n, create a Webhook trigger node
2. Copy the webhook URL
3. In Oikion, go to the API Keys page
4. Use the API to create a webhook endpoint:

```bash
curl -X POST "https://your-domain.com/api/v1/webhooks" \
  -H "Authorization: Bearer oik_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Client Updates",
    "url": "https://your-n8n-instance.com/webhook/abc123",
    "events": ["client.updated"]
  }'
```

**n8n Workflow:**
```
[Webhook Trigger] → [IF: Status = ACTIVE] → [HTTP Request: Create Task]
```

### 3. Sync Calendar Events to Google Calendar

Fetch upcoming Oikion events and create them in Google Calendar.

```
[Schedule Trigger] → [HTTP Request: Get Events] → [Loop] → [Google Calendar: Create Event]
```

**HTTP Request Node (Get Events):**
- Method: GET
- URL: `https://your-domain.com/api/v1/calendar/events`
- Query Parameters:
  - `startTime`: `{{ $now.toISO() }}`
  - `endTime`: `{{ $now.plus({ days: 7 }).toISO() }}`

### 4. Property Listing Automation

When a new property is created, post it to social media.

**Setup:**
1. Create a webhook in Oikion for `property.created`
2. Point it to your n8n webhook URL

**n8n Workflow:**
```
[Webhook Trigger] → [Set: Format Message] → [Twitter: Post Tweet] → [Facebook: Post]
```

**Set Node (Format Message):**
```javascript
const property = $json.data.property;
return {
  message: `🏠 New Listing: ${property.name}\n💰 ${property.price}€\n📍 ${property.address?.city}\n\nContact us for more info!`
};
```

### 5. Daily Report of New Clients

Generate a daily summary of new clients.

```
[Schedule Trigger: Daily] → [HTTP Request: Get Clients] → [Aggregate] → [Email: Send Report]
```

**HTTP Request Node:**
- Method: GET
- URL: `https://your-domain.com/api/v1/crm/clients`
- Query Parameters:
  - `limit`: `100`

## Error Handling

Add error handling to your workflows:

1. **Check Response Status:**
```javascript
if ($json.error) {
  throw new Error($json.error);
}
```

2. **Retry on Rate Limit:**
If you receive a 429 status, wait and retry:
```javascript
if ($response.statusCode === 429) {
  const retryAfter = $response.headers['retry-after'] || 60;
  await new Promise(r => setTimeout(r, retryAfter * 1000));
  // Retry the request
}
```

## Best Practices

1. **Use Pagination:** For large datasets, always paginate:
   ```javascript
   let allClients = [];
   let cursor = null;
   
   do {
     const response = await fetch(url + (cursor ? `?cursor=${cursor}` : ''));
     const data = await response.json();
     allClients = [...allClients, ...data.data.clients];
     cursor = data.meta.nextCursor;
   } while (data.meta.hasMore);
   ```

2. **Handle Webhooks Idempotently:** Use the `X-Webhook-Delivery-Id` header to prevent duplicate processing.

3. **Verify Webhook Signatures:** Always verify webhook signatures in production.

4. **Use Appropriate Scopes:** Only request the scopes you need for your integration.

## Troubleshooting

### 401 Unauthorized
- Check that your API key is correct
- Ensure the key hasn't been revoked
- Verify the Authorization header format: `Bearer oik_...`

### 403 Forbidden
- Check that your API key has the required scope for the endpoint
- Verify you're accessing resources within your organization

### 429 Too Many Requests
- You've exceeded the rate limit (100 requests/minute)
- Implement exponential backoff and retry logic

### Webhook Not Receiving Events
- Verify the webhook URL is accessible from the internet
- Check that the webhook is active in Oikion
- Ensure you've subscribed to the correct events
