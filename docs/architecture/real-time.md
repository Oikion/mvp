# Real-Time

Oikion uses [Ably](https://ably.com) for WebSocket-based real-time messaging.

## Environment variable

```env
NEXT_PUBLIC_ABLY_KEY=your-ably-key
```

Without this key, real-time features degrade gracefully (no crashes, but no live updates).

## Entity-as-channel pattern

Each entity that supports real-time updates gets its own Ably channel named after the entity type and ID:

```
org:{organizationId}:messaging         # Direct messages
org:{organizationId}:feed              # Activity feed updates
org:{organizationId}:property:{id}     # Property-specific events
org:{organizationId}:client:{id}       # Client-specific events
```

The `organizationId` prefix ensures channel isolation between tenants.

## Client-side subscription

SWR hooks in `hooks/swr/useMessaging.ts` subscribe to Ably channels and mutate the SWR cache on incoming events, providing optimistic real-time updates without polling.

## Server-side publishing

Server actions publish events to Ably after successful database mutations:

```typescript
import Ably from "ably";

const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_KEY!);
const channel = ably.channels.get(`org:${organizationId}:feed`);
await channel.publish("activity.created", { entityId, type });
```

## Typing indicators

Messaging typing indicators use the `burst` rate limit tier (30 req/10s) to avoid flooding the rate limiter during rapid typing.

## Key files

| File | Purpose |
|------|---------|
| `hooks/swr/useMessaging.ts` | Ably subscription + SWR cache integration |
| `actions/messaging/` | Server actions that publish to Ably after DB writes |
| `lib/ably.ts` | Ably client singleton (if present) |
