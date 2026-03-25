# Make.com Integration Guide

This guide shows how to integrate Oikion with Make.com for workflow automation.

## Prerequisites

1. An Oikion account with admin access
2. A Make.com account
3. An API key from Oikion with appropriate scopes

## Creating an API Key

1. Log in to Oikion as an admin
2. Navigate to **Admin → API Keys**
3. Click **Create API Key**
4. Name it "Make.com Integration"
5. Select the scopes you need
6. Copy the generated API key (shown only once!)

## Setting Up Make.com

### Creating a Custom Connection

1. In Make.com, go to **Connections**
2. Click **Add** and select **HTTP**
3. Configure the connection:
   - Name: `Oikion API`
   - Base URL: `https://your-oikion-domain.com/api/v1`
   - Headers:
     - `Authorization`: `Bearer oik_your_api_key_here`
     - `Content-Type`: `application/json`

### Using the HTTP Module

For Oikion API calls, use the **HTTP > Make a request** module.

## Example Scenarios

### 1. Create Client from Typeform Submission

**Trigger:** Typeform - Watch Responses
**Action:** HTTP - Make a request

```json
{
  "name": "{{1.answers.0.text}}",
  "email": "{{1.answers.1.email}}",
  "phone": "{{1.answers.2.phone_number}}",
  "status": "LEAD",
  "leadSource": "WEB"
}
```

POST to `https://your-domain.com/api/v1/crm/clients`

### 2. Sync Oikion Events to Google Calendar

**Trigger:** Schedule - Every hour
**Actions:** HTTP Get events → Iterator → Google Calendar Create event

GET `https://your-domain.com/api/v1/calendar/events` with query params:
- `startTime`: `{{formatDate(now; "YYYY-MM-DDTHH:mm:ss.SSSZ")}}`
- `endTime`: `{{formatDate(addDays(now; 7); "YYYY-MM-DDTHH:mm:ss.SSSZ")}}`
- `limit`: `50`

### 3. Property Alert System

1. In Make.com, add a **Webhooks > Custom webhook** module and copy the URL
2. Create a webhook in Oikion:

```bash
curl -X POST "https://your-domain.com/api/v1/webhooks" \
  -H "Authorization: Bearer oik_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "Make.com Property Alerts", "url": "https://hook.make.com/your-id", "events": ["property.created"]}'
```

3. Add a filter: `{{1.data.property.price}}` Less than `500000`

## Working with Pagination

Use a loop: HTTP Get Page 1 → Iterator → Process Item → Router → (if hasMore) HTTP Get Next Page with `nextCursor`.

## Webhook Signature Verification

```javascript
const signedPayload = `${timestamp}.${JSON.stringify(body)}`;
const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
return signature === expected;
```

## Error Handling

| Status | Meaning | Solution |
|--------|---------|----------|
| 401 | Invalid API key | Check your API key |
| 403 | Insufficient permissions | Add required scopes |
| 404 | Resource not found | Verify the ID exists |
| 429 | Rate limited | Add Sleep module (1s delay) |
| 500 | Server error | Retry after a moment |

## Best Practices

- **Use Data Stores** to cache frequently accessed data
- **Implement Idempotency** using webhook delivery IDs (`X-Webhook-Delivery-Id`)
- **Monitor Execution** with email notifications for failed scenarios
- **Use Filters Early** before making additional API calls
