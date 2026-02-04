# Make.com (Integromat) Integration Guide

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

**HTTP Module Configuration:**
- URL: `https://your-domain.com/api/v1/crm/clients`
- Method: POST
- Headers:
  - Authorization: `Bearer oik_your_api_key`
  - Content-Type: `application/json`
- Body type: Raw
- Content type: JSON (application/json)
- Request content:

```json
{
  "name": "{{1.answers.0.text}}",
  "email": "{{1.answers.1.email}}",
  "phone": "{{1.answers.2.phone_number}}",
  "status": "LEAD",
  "leadSource": "WEB",
  "intent": "BUY"
}
```

### 2. Sync Oikion Events to Google Calendar

**Trigger:** Schedule - Every hour
**Action 1:** HTTP - Make a request (Get events)
**Action 2:** Iterator
**Action 3:** Google Calendar - Create an event

**Get Events HTTP Configuration:**
- URL: `https://your-domain.com/api/v1/calendar/events`
- Method: GET
- Query String:
  - startTime: `{{formatDate(now; "YYYY-MM-DDTHH:mm:ss.SSSZ")}}`
  - endTime: `{{formatDate(addDays(now; 7); "YYYY-MM-DDTHH:mm:ss.SSSZ")}}`
  - limit: `50`

### 3. Property Alert System

Send notifications when new properties match criteria.

**Scenario Flow:**
```
[Webhook] → [Filter: Price < 500000] → [Email] → [Slack]
```

**Webhook Setup:**
1. In Make.com, add a **Webhooks > Custom webhook** module
2. Copy the webhook URL
3. Create a webhook in Oikion:

```bash
curl -X POST "https://your-domain.com/api/v1/webhooks" \
  -H "Authorization: Bearer oik_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Make.com Property Alerts",
    "url": "https://hook.make.com/your-webhook-id",
    "events": ["property.created"]
  }'
```

**Filter Configuration:**
- Condition: `{{1.data.property.price}}` Less than `500000`

### 4. Daily Client Summary to Slack

**Trigger:** Schedule - Every day at 9:00 AM
**Action 1:** HTTP - Get clients
**Action 2:** Aggregator - Aggregate to JSON
**Action 3:** Slack - Create a message

**Get Clients Configuration:**
- URL: `https://your-domain.com/api/v1/crm/clients`
- Method: GET
- Query String:
  - status: `LEAD`
  - limit: `100`

**Slack Message:**
```
📊 *Daily Lead Summary*

Total new leads: {{length(2.array)}}

{{#each 2.array}}
• {{this.name}} - {{this.email}}
{{/each}}
```

### 5. Two-Way CRM Sync with HubSpot

Sync clients between Oikion and HubSpot.

**Oikion → HubSpot:**
```
[Oikion Webhook: client.created] → [HubSpot: Create Contact]
```

**HubSpot → Oikion:**
```
[HubSpot: Watch Contacts] → [HTTP: Create Oikion Client]
```

## Working with Pagination

For endpoints that return paginated data, use a loop:

```
[HTTP: Get Page 1] → [Iterator] → [Process Item] → [Router]
                                                      ↓
                                        [HTTP: Get Next Page] ←
```

**Implementation:**
1. First HTTP module gets initial page
2. Iterator processes each item
3. Router checks if `hasMore` is true
4. If true, make another request with the `nextCursor`

## Webhook Signature Verification

For security, verify webhook signatures:

**Custom Function (Tools > Set variable):**
```javascript
const crypto = require('crypto');

const payload = JSON.stringify({{1.body}});
const timestamp = {{1.headers.`x-webhook-timestamp`}};
const signature = {{1.headers.`x-webhook-signature`}};
const secret = 'whsec_your_webhook_secret';

const signedPayload = `${timestamp}.${payload}`;
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

return signature === expectedSignature;
```

## Error Handling

### Using Error Handlers

Add error handlers to your scenarios:

1. Right-click on a module
2. Select **Add error handler**
3. Choose appropriate handler:
   - **Resume:** Continue with default value
   - **Rollback:** Undo all operations
   - **Commit:** Save completed operations

### Common Errors

| Status | Meaning | Solution |
|--------|---------|----------|
| 401 | Invalid API key | Check your API key |
| 403 | Insufficient permissions | Add required scopes |
| 404 | Resource not found | Verify the ID exists |
| 429 | Rate limited | Add delay between requests |
| 500 | Server error | Retry after a moment |

### Rate Limit Handling

Add a **Sleep** module after HTTP requests:
- Duration: 1 second
- This ensures you stay under 100 requests/minute

## Best Practices

1. **Use Data Stores:** Cache frequently accessed data to reduce API calls

2. **Implement Idempotency:** Use webhook delivery IDs to prevent duplicate processing

3. **Monitor Execution:** Set up email notifications for failed scenarios

4. **Use Filters Early:** Filter data before making additional API calls

5. **Batch Operations:** When possible, process multiple items in a single scenario run

## Templates

### Quick Start Template: Lead Capture

```
[Typeform/Google Forms] → [HTTP: Create Client] → [Email: Confirmation] → [Slack: Notify Team]
```

### Quick Start Template: Property Sync

```
[Schedule: Hourly] → [HTTP: Get Properties] → [Iterator] → [Google Sheets: Update Row]
```

### Quick Start Template: Task Automation

```
[Oikion Webhook: client.created] → [HTTP: Create Task] → [Email: Assign to Agent]
```

## Support

For issues with:
- **Oikion API:** Contact Oikion support
- **Make.com:** Visit [Make.com Help Center](https://www.make.com/en/help)
