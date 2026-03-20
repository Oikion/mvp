# Security Policies

## Credential Rotation Policy

### Scope

Applies to all secrets used by:
- Application runtime (production and preview)
- Local development environments
- CI/CD pipelines
- External integrations (email, AI providers, realtime, storage)

### Rotation Schedule

| Credential | Variable(s) | Interval | Owner |
|-----------|-------------|----------|-------|
| Database | `DATABASE_URL`, `DIRECT_DATABASE_URL` | 90 days | Platform Admin |
| Auth provider | `CLERK_SECRET_KEY` | 180 days | Platform Admin |
| Email | `RESEND_API_KEY` | 90 days | Platform Admin |
| Realtime | `ABLY_API_KEY` | 90 days | Platform Admin |
| AI providers | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | 90 days | Platform Admin |
| Deployment | `VERCEL_OIDC_TOKEN` | 90 days | DevOps |

### Rotation Procedure

1. Generate new credential in the provider dashboard
2. Update in all environments:
   - Local `.env.local`
   - Vercel project environment variables (production + preview):
     ```bash
     vercel env rm <VARIABLE> production preview
     vercel env add <VARIABLE> production preview
     ```
   - CI/CD secrets if applicable
3. Trigger a redeployment
4. Verify old credentials are revoked and new ones are functional
5. Record the rotation in [audit-log.md](./audit-log.md)

### Emergency Rotation

Trigger immediately when:
- Credentials appear in logs, commits, screenshots, or support tickets
- Suspicious access is detected
- A provider reports a possible key compromise

Steps:
1. Rotate compromised credentials within **15 minutes**
2. Revoke the old keys in the provider dashboard
3. Audit access logs for unauthorized activity
4. Notify affected stakeholders and document the incident

### Verification Checklist

- Old credentials fail authentication
- New credentials pass in all environments
- Production deployment is healthy post-redeploy
- Access logs show no unauthorized activity after rotation

## Secret Management Practices

- Never commit secrets to git; `.env.local` is in `.gitignore`
- Use Vercel environment variables for production; never `.env` in the repo
- API keys stored in the database are encrypted with the org's DEK before persisting
- `lib/env.ts` validates required env vars at production startup — deployment fails fast on misconfiguration
- Gitleaks scans every push and PR; findings block merge

## Review Cadence

This policy is reviewed quarterly and after any security incident.
