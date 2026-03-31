# Credential Rotation Policy

## Purpose

This policy defines how Oikion rotates credentials to reduce exposure risk and ensure compliance.

## Scope

Applies to all secrets and credentials used by:
- Application runtime (production and preview)
- Local development environments
- CI/CD pipelines
- External integrations (email, AI providers, realtime, storage)

## Rotation Schedule

| Credential Type | Rotation Interval | Owner |
| --- | --- | --- |
| Database credentials (DATABASE_URL, DIRECT_DATABASE_URL) | 90 days | Platform Admin |
| Auth provider (CLERK_SECRET_KEY) | 180 days | Platform Admin |
| Email provider (RESEND_API_KEY) | 90 days | Platform Admin |
| Realtime provider (ABLY_API_KEY) | 90 days | Platform Admin |
| AI providers (OPENAI_API_KEY, ANTHROPIC_API_KEY) | 90 days | Platform Admin |
| Deployment tokens (VERCEL_OIDC_TOKEN) | 90 days | DevOps |

## Rotation Procedure

1. Generate a new credential in the provider dashboard.
2. Update credentials in:
   - Local `.env.local`
   - Vercel project environment variables (production and preview)
   - CI/CD secrets where applicable
3. Redeploy the application.
4. Verify old credentials are revoked and new credentials are functional.
5. Record rotation date and owner in the security log.

## Emergency Rotation

Trigger emergency rotation immediately when:
- Credentials are exposed in logs, commits, screenshots, or support tickets
- Suspicious access is detected
- A provider reports a possible key compromise

Emergency steps:
1. Rotate compromised credentials within 15 minutes.
2. Invalidate and revoke old keys.
3. Audit logs for unauthorized access.
4. Notify stakeholders and document the incident.

## Verification Checklist

- Old credentials fail authentication.
- New credentials pass authentication in all environments.
- Production deployment is healthy after redeploy.
- Access logs show no unauthorized activity after rotation.

## Documentation

Record rotations in:
- `docs/security/rotation-log.md` (add the date, credential type, and owner)
- Incident records when rotation is due to compromise

## Review

This policy is reviewed quarterly and updated after any security incident.
