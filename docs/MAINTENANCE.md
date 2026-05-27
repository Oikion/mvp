# Documentation Maintenance

## Quarterly Review Checklist

Use this checklist every quarter to keep documentation current.

- [ ] Are all nested CLAUDE.md files accurate? (check against current code patterns)
- [ ] Are ADR statuses current? (`docs/decisions/index.md`)
- [ ] Are API endpoint docs matching actual routes? (`docs/api-reference/endpoints/`)
- [ ] Is the getting-started guide still accurate? (try following it from scratch)
- [ ] Has the changelog been updated since last review?
- [ ] Are all internal doc links resolving?

## Last Review

- **Date:** (not yet reviewed)
- **Reviewer:** —
- **Issues found:** —

## Review History

| Date | Reviewer | Issues Found | Issues Fixed |
|------|----------|-------------|-------------|
| — | — | — | — |

## Google Calendar Token Key Rotation

Google Calendar OAuth tokens are encrypted with `SECRETS_ENCRYPTION_KEY` (AES-256-GCM global master key). Use this procedure when rotating the key.

### Generate a new key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rotation procedure
1. Generate a new key (see above)
2. Set `SECRETS_ENCRYPTION_KEY_PREVIOUS` = current key value
3. Set `SECRETS_ENCRYPTION_KEY` = new key value
4. Deploy (the app now decrypts with either key via `decryptWithFallback`)
5. Run: `pnpm tsx scripts/reencrypt-google-tokens.ts`
6. Verify 0 errors in output
7. Remove `SECRETS_ENCRYPTION_KEY_PREVIOUS` from env
8. Redeploy (rotation complete)
