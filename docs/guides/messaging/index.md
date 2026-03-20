# Messaging Guide

Real-time messaging with end-to-end encryption for Oikion.

> Content to be developed. This stub covers key code paths and conventions.

## Overview

The messaging system provides:
- **Real-time conversations** — powered by Ably WebSockets
- **E2EE** — optional end-to-end encryption with per-user passphrases (client-side)
- **Conversation scopes** — `PERSONAL`, `ORGANIZATION`, `SHARED` (bilateral cross-org)
- **Entity channels** — conversations linked to a specific property or client

## Key Code Paths

| Area | Path |
|------|------|
| Server actions | `actions/messaging/` |
| E2EE API routes | `app/api/e2ee/` |
| Page routes | `app/[locale]/app/(routes)/messaging/` |
| Real-time hooks | `hooks/` (Ably subscription hooks) |

## Encryption Layers

Two independent layers exist:

| Layer | Where | Key | Purpose |
|-------|-------|-----|---------|
| Server-side (DEK) | `lib/model-encryption.ts` | Per-org key | Encrypts sensitive DB fields at rest |
| Client-side (E2EE) | `lib/crypto/field-handlers.ts` | Per-user passphrase | End-to-end encrypted message content |

Format: server-side uses `iv:auth:ct`; E2EE uses `e2ee:v1:<base64>`.

The E2EE layer is scheduled for retirement per the unified encryption spec — check `docs/superpowers/specs/` for current status before modifying crypto code.

## Conversation Model

```typescript
// ConversationScope enum (separate from ItemVisibility — do NOT confuse)
enum ConversationScope {
  PERSONAL      // private to user
  ORGANIZATION  // visible to org members
  SHARED        // bilateral cross-org
}
```

## Ably Integration

Real-time features require `NEXT_PUBLIC_ABLY_KEY` in environment variables.

```typescript
// Presence and message subscription pattern
import Ably from 'ably'
const client = new Ably.Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY })
```

## Permissions

Messaging actions are guarded by `actions/messaging/` server actions which verify Clerk session and `organizationId` isolation on every operation.

## Related

- Architecture: `docs/architecture/`
- E2EE spec: `docs/superpowers/specs/2026-03-15-unified-encryption-architecture-design.md`
- Ably docs: https://ably.com/docs
