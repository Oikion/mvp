# Mandates API

Endpoint planned — not yet implemented.

The mandates resource will be available at `/api/v1/mls/mandates` once the external API for mandates is built.

## Planned Endpoints

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/mls/mandates` | `mls:read` | List mandates |
| POST | `/api/v1/mls/mandates` | `mls:write` | Create mandate |
| GET | `/api/v1/mls/mandates/{id}` | `mls:read` | Get mandate |
| PUT | `/api/v1/mls/mandates/{id}` | `mls:write` | Update mandate |
| DELETE | `/api/v1/mls/mandates/{id}` | `mls:write` | Delete mandate |

## Internal API (Clerk Auth)

Mandates are managed internally via server actions at `actions/mls/`. For internal use, see the Prisma `Mandate` model in `prisma/schema.prisma` for the full field list.

Key mandate fields: `title`, `notes`, `visibility` (`HIDDEN|PRIVATE|SECURE|PUBLIC`), `assigned_to`, `client_id`, `property_id`, `mandate_type`, `start_date`, `end_date`, `commission_type`, `commission_value`.
