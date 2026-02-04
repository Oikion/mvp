# n8n Automation Setup for Oikion

This directory contains the Docker configuration for running n8n as the automation engine for the Oikion platform.

## Quick Start

### 1. Configure Environment

```bash
cd n8n
cp .env.example .env
```

Edit `.env` and set:
- `N8N_ENCRYPTION_KEY` - Generate with: `openssl rand -hex 32`
- `N8N_JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `N8N_ADMIN_PASSWORD` - Your admin password
- `OIKION_API_KEY` - Create in Oikion Platform Admin > API Keys

### 2. Start n8n

```bash
docker-compose up -d
```

### 3. Access n8n

Open http://localhost:5678 in your browser.

Login with:
- Username: `admin` (or your `N8N_ADMIN_USER`)
- Password: Your `N8N_ADMIN_PASSWORD`

## Integration with Oikion

### Embedding in Admin Platform

n8n is configured to be embeddable via iframe in the Oikion Admin Platform. Access it at:
- **Platform Admin** → **Automation**

### API Endpoints

n8n workflows can interact with Oikion via these API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/blog/posts` | POST | Create a blog post |
| `/api/v1/newsletter/send` | POST | Send a newsletter |
| `/api/v1/newsletter/subscribers` | GET/POST | Manage subscribers |
| `/api/v1/social/log` | POST | Log social media posts |
| `/api/v1/n8n/webhook` | POST | Receive n8n callbacks |

### Authentication

All API calls require the `Authorization` header:
```
Authorization: Bearer oik_your_api_key_here
```

## Workflow Templates

Import starter workflow templates from the `workflows/` directory:

1. `blog-post-workflow.json` - AI-assisted blog post creation
2. `social-multi-platform.json` - Post to LinkedIn, Instagram, TikTok
3. `newsletter-campaign.json` - Newsletter composition and send
4. `content-approval.json` - Approval workflow with notifications

### Importing Workflows

1. Open n8n UI
2. Go to **Workflows** → **Import from File**
3. Select the JSON file from `workflows/`
4. Update credentials and API keys

## Social Media Integration

### LinkedIn
1. Go to **Credentials** in n8n
2. Add **LinkedIn OAuth2** credential
3. Configure with your LinkedIn App credentials

### Instagram
1. Requires Facebook Business account
2. Add **Facebook Graph API** credential
3. Use Instagram Business Account ID

### TikTok
1. Add **TikTok** credential
2. Configure with TikTok Developer credentials

## Troubleshooting

### n8n won't start
```bash
docker-compose logs n8n
```

### Database connection issues
```bash
docker-compose logs n8n-postgres
```

### Reset n8n data
```bash
docker-compose down -v
docker-compose up -d
```

### Health Check
```bash
curl http://localhost:5678/healthz
```

## Production Deployment

For production:

1. Update `N8N_PROTOCOL` to `https`
2. Configure proper domain in `N8N_HOST` and `N8N_WEBHOOK_URL`
3. Use strong passwords and secrets
4. Consider using external PostgreSQL
5. Set up proper SSL/TLS termination

## Security Notes

- n8n is configured with basic auth for the admin UI
- All credentials are encrypted with `N8N_ENCRYPTION_KEY`
- Webhook endpoints should validate signatures
- Use separate API keys for n8n with minimal required scopes
