# Network Module — Technical & Business Reference

> **Audience:** Full engineering and product team
> **Last updated:** 2026-04-03
> **Status:** In-depth reference for improvement discussions

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context & Goals](#2-business-context--goals)
3. [Module Architecture Overview](#3-module-architecture-overview)
4. [Feature Breakdown](#4-feature-breakdown)
   - 4.1 [Agent Connections](#41-agent-connections)
   - 4.2 [Agent & Agency Profiles](#42-agent--agency-profiles)
   - 4.3 [Agent & Agency Discovery](#43-agent--agency-discovery)
   - 4.4 [Polis — Cross-Org Matchmaking](#44-polis--cross-org-matchmaking)
   - 4.5 [Entity Sharing](#45-entity-sharing)
   - 4.6 [Social Feed](#46-social-feed)
   - 4.7 [Messaging with E2EE](#47-messaging-with-e2ee)
   - 4.8 [Sharing Hub](#48-sharing-hub)
5. [Data Model](#5-data-model)
6. [Scoring Engine — Matchmaking Algorithm](#6-scoring-engine--matchmaking-algorithm)
7. [Privacy & Visibility System](#7-privacy--visibility-system)
8. [Security & Multi-Tenancy](#8-security--multi-tenancy)
9. [Background Jobs & Infrastructure](#9-background-jobs--infrastructure)
10. [Feature Gating](#10-feature-gating)
11. [Technology Stack & Patterns](#11-technology-stack--patterns)
12. [File Inventory](#12-file-inventory)
13. [Integration Points](#13-integration-points)
14. [Known Limitations & Technical Debt](#14-known-limitations--technical-debt)

---

## 1. Executive Summary

The **Network Module** (internally codenamed **Polis**) is Oikion's inter-agency collaboration layer. It transforms the platform from isolated per-agency silos into a connected marketplace where Greek real estate agencies can discover each other, establish partnerships, share listings, and automatically match mandates (buyer requirements) against properties across organizational boundaries — all while maintaining strict control over what data is visible and to whom.

**Key capabilities:**
- **Agent-to-agent connections** with request/accept workflow and notifications
- **Public/private agent and agency profiles** with showcase properties
- **Discovery search** for agents and agencies across the platform
- **Polis cross-org matchmaking** — automated background scoring of mandates vs. properties from partner agencies
- **Granular privacy controls** — each org chooses what to share and at what level of detail (anonymized → full contact info)
- **Direct entity sharing** — send individual properties, clients, or documents to specific connections
- **Social feed** — org-scoped activity posts linked to business entities with real-time updates via Ably
- **End-to-end encrypted messaging** — DMs and group channels with Megolm ratchet encryption
- **Sharing Hub** — unified dashboard for all sharing activity (outbound, inbound, Polis)

---

## 2. Business Context & Goals

### The Problem

Greek real estate agencies typically operate in isolation. When an agency has a buyer but no matching property (or vice versa), the agent must manually call colleagues at other agencies, exchange spreadsheets, or use fragmented listing portals. This creates:

- **Lost deals** — mandates expire before a matching property is found
- **Duplicated effort** — the same search/outreach repeated across agencies
- **Trust barriers** — no way to control what information is shared or with whom
- **No accountability** — verbal agreements leave no audit trail

### The Solution

The Network Module addresses these by providing:

| Business Goal | Feature | Mechanism |
|---|---|---|
| Find matching properties/mandates across agencies | Polis cross-org matchmaking | Automated 30-min background scoring job |
| Control data exposure | 3-tier privacy levels + 4-tier item visibility | Per-org settings, applied at read time |
| Discover and evaluate potential partners | Agent/agency profiles + discovery search | PUBLIC/SECURE profile visibility |
| Formalize partnerships | Bilateral partner invitations | Invite → Accept → Active partnership |
| Share specific items with trusted contacts | Entity sharing (property/client/document) | Connection-gated sharing with permissions |
| Communicate securely | E2EE messaging | Megolm group ratchet, key backup |
| Track industry activity | Social feed | Org-scoped posts with entity links |

### Business Rules

- **Opt-in only** — Polis is disabled by default; a Platform Admin must enable it per org
- **Org-level settings** — the agency (not individual agents) decides what to share and at what privacy level
- **Bilateral partnerships** — agencies can form explicit partnerships independent of the open pool
- **No data leakage by default** — items at HIDDEN or PRIVATE visibility never enter Polis computation
- **Symmetric viewing** — if Org A sees Org B's property in a match, Org B sees Org A's mandate too (each filtered by the source org's privacy settings)

---

## 3. Module Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        NETWORK MODULE                            │
│  Feature gate: canAccessModule("network") in layout.tsx          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ Connec-  │ Profiles │ Discovery│ Polis    │ Entity   │ Social   │
│ tions    │ & Show-  │ Search   │ Cross-Org│ Sharing  │ Feed     │
│          │ case     │          │ Matching │          │          │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┤
│                         Messaging (E2EE)                         │
├──────────────────────────────────────────────────────────────────┤
│                     Privacy Filtering Layer                      │
│         lib/network/privacy-filter.ts (read-time)                │
├──────────────────────────────────────────────────────────────────┤
│                    Matchmaking Scoring Engine                     │
│         lib/matchmaking/calculator.ts + weights.ts               │
├──────────────────────────────────────────────────────────────────┤
│                      Data Layer (Prisma)                          │
│  AgentConnection · AgentProfile · AgencyProfile · SharedEntity   │
│  OrgNetworkSettings · OrgNetworkPartner · CrossOrgMatch          │
│  SocialPost · Conversation · Message · GroupSession              │
├──────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                           │
│  Vercel Cron (30-min match job) · Ably (real-time) · Clerk Auth  │
│  Prisma Accelerate (prod) · Server-side encryption (DEK chain)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Breakdown

### 4.1 Agent Connections

**Purpose:** User-to-user relationships that gate entity sharing and messaging.

**Workflow:**
```
Agent A searches → finds Agent B → sends request (PENDING)
                                         ↓
                              Agent B receives notification
                                         ↓
                              Accept → ACCEPTED (bilateral)
                              Reject → REJECTED
                                         ↓
                              Either party can remove later
```

**Implementation details:**

| Aspect | Detail |
|---|---|
| Model | `AgentConnection` (followerId → followingId, status) |
| Unique constraint | `(followerId, followingId)` prevents duplicate requests |
| Bidirectional check | All queries use `OR [{ A→B }, { B→A }]` to find any relationship direction |
| Race condition handling | TOCTOU protection via P2002 unique constraint catch on concurrent creates |
| Re-invitation | REJECTED connections can be re-sent by updating the existing row to PENDING |
| Notifications | `notifyConnectionRequest()` and `notifyConnectionAccepted()` fire in-app + email |
| Authorization | Either party can remove; only the target can accept/reject |

**Key files:**
- `actions/social/connections.ts` — all connection CRUD (7 exported functions)
- `app/[locale]/app/(routes)/network/components/ConnectionsList.tsx` — list display
- `app/[locale]/app/(routes)/network/components/PendingRequestsList.tsx` — pending UI

---

### 4.2 Agent & Agency Profiles

**Purpose:** Public-facing identity for individual agents and agencies.

#### Agent Profile (`AgentProfile`)

Each user has an optional 1:1 profile containing:
- **Identity**: slug (from username), bio
- **Professional info**: specializations, serviceAreas, languages, certifications
- **Visibility**: PRIVATE / SECURE / PUBLIC
- **Discovery control**: `hideFromAgentSearch` opt-out flag
- **Contact form**: optional custom form fields for inbound inquiries
- **Showcase**: curated list of properties with display order

The slug is derived from the user's `username` field and forms the public URL: `/network/agents/{username}`.

#### Agency Profile (`AgencyProfile`)

Each organization has an optional 1:1 profile containing:
- **Identity**: name + slug (always synced from Clerk organization)
- **Business info**: description, phone, email, website, address, city, region, postalCode
- **Credentials**: yearFounded, licenseNumber
- **Social**: socialLinks JSON (LinkedIn, Facebook, Instagram, Twitter)
- **Visibility**: PRIVATE / SECURE / PUBLIC
- **Contact form**: optional custom form for agency-level inquiries, `contactFormFields` JSON

**Important detail:** The `name` and `slug` on `AgencyProfile` are **always sourced from Clerk** during upsert — never from user input. This prevents slug desync between Clerk organization identity and the Oikion profile.

**Key files:**
- `actions/social/profile.ts` — agent profile CRUD
- `actions/social/showcase.ts` — showcase property management
- `actions/organization/agency-profile.ts` — agency profile CRUD with Clerk sync
- `app/[locale]/app/(routes)/network/profile/` — profile editing UI (3 tabs: Edit, Showcase, Preview)

---

### 4.3 Agent & Agency Discovery

**Purpose:** Find agents and agencies across the platform, respecting visibility settings.

**Search behavior:**

| Viewer | Sees |
|---|---|
| Anonymous (not authenticated) | PUBLIC profiles only |
| Authenticated user | PUBLIC + SECURE profiles |
| Anyone | Never sees PRIVATE profiles or `hideFromAgentSearch: true` |

**Agent discovery** (`discoverAgents()`):
- Text query matches against: name, username, bio, serviceAreas, specializations
- Filter by: serviceAreas, specializations
- Cursor-based pagination (default 20 per page)
- Always excludes current user
- Returns: id, slug, name, avatar, bio, specializations, serviceAreas

**Agent search for connections** (`searchAgentsToConnect()`):
- Similar to discovery but also returns existing connection status with each agent
- Includes count of PUBLIC active properties (for social proof)
- Input sanitized: query truncated to 200 chars, limit capped at 100

**Agency discovery** (`discoverAgencies()`):
- Follows same PUBLIC/SECURE pattern
- Returns: name, slug, logo, city, description

**Key files:**
- `actions/network/discover-agents.ts` — agent discovery search
- `actions/network/discover-agencies.ts` — agency discovery search
- `actions/social/connections.ts:searchAgentsToConnect()` — connection-aware search
- `app/[locale]/app/(routes)/network/agents/[username]/` — public agent profile view

---

### 4.4 Polis — Cross-Org Matchmaking

**Purpose:** Automatically find property-mandate matches across participating agencies.

This is the most complex subsystem in the Network Module. It has three layers:

#### Layer 1: Organization Settings

Each org configures their Polis participation via `OrgNetworkSettings`:

| Setting | Options | Effect |
|---|---|---|
| `membership` | `NONE` / `POOL` / `BILATERAL` / `BOTH` | Determines which orgs can match against your data |
| `shareProperties` | Boolean | Whether your properties enter Polis computation |
| `shareMandates` | Boolean | Whether your mandates enter Polis computation |
| `propertyPrivacyLevel` | `ANONYMIZED` / `AGENCY_IDENTIFIED` / `FULL` | How much detail other orgs see about your properties |
| `mandatePrivacyLevel` | `ANONYMIZED` / `AGENCY_IDENTIFIED` / `FULL` | How much detail other orgs see about your mandates |

**Membership types explained:**
- **POOL**: Open marketplace — your data matches against ALL other Pool/Both members
- **BILATERAL**: Closed network — only matches against orgs you've formed explicit partnerships with
- **BOTH**: Pool + Bilateral — participates in the open pool AND has explicit bilateral partners

#### Layer 2: Bilateral Partnerships

Agencies can form explicit partnerships via `OrgNetworkPartner`:

```
Agency A invites (by slug) → PENDING
                                  ↓
                       Agency B sees in settings
                                  ↓
                       Accept → ACCEPTED (+ acceptedAt timestamp)
                       Reject → REJECTED
                       Either side can revoke → REVOKED
```

Partnerships are **directional in storage** (`initiatorOrgId` → `partnerOrgId`) but **bidirectional in behavior** — either party can revoke, and matching runs in both directions. A unique constraint on `(initiatorOrgId, partnerOrgId)` prevents duplicates, and the code checks both directions before creating.

**Authorization:** All partnership actions require `admin:manage_org_settings` permission (ORG_OWNER or ADMIN role).

#### Layer 3: Background Match Computation

The match job (`computeCrossOrgMatches()`) runs every 30 minutes via Vercel Cron:

```
1. Load all orgs where membership ≠ NONE
   (Skip if < 2 participating orgs)

2. For each org, in batches of 10:
   - If shareProperties: fetch ACTIVE/PENDING properties with visibility SECURE or PUBLIC
   - If shareMandates: fetch ACTIVE mandates with visibility SECURE or PUBLIC
   - Decrypt encrypted fields using per-org DEK chain
   - Adapt to scoring engine input format (ClientForMatching / PropertyForMatching)

3. For each mandate-owning org:
   - Determine eligible property orgs based on membership rules:
     • POOL/BOTH: all other Pool/Both members
     • BILATERAL/BOTH: all accepted bilateral partners
   - For each eligible property org (if they share properties):
     - For each mandate × property pair:
       - Run calculateMatchScore() → 0-100 score + breakdown
       - Upsert CrossOrgMatch row (mandateId + propertyId as unique key)
       - Set TTL: min(mandate.expires_at, now + 30 days)

4. Clean up expired CrossOrgMatch rows (expiresAt < now)

5. Return stats: { upserted, expired, errors }
```

**Key architectural decisions:**
- **Scores stored, not details** — `CrossOrgMatch` stores only IDs, score, and breakdown JSON. No property/mandate data is duplicated
- **Privacy filtering at read time** — when an org views their matches, `filterProperty()` / `filterMandate()` strips information based on the source org's *current* privacy level. This means privacy level changes take effect instantly without recomputing
- **Encryption-aware** — the job calls `decryptMandateForOrg()` / `decryptPropertyForOrg()` using the platform's DEK chain, then discards decrypted data after scoring
- **Graceful degradation** — corrupted/undecryptable records are silently skipped; errors are counted and logged

**Cron endpoint security:** The `/api/cron/cross-org-matches` route uses timing-safe comparison of the `Authorization` header against `CRON_SECRET` environment variable.

**Key files:**
- `actions/network/compute-cross-org-matches.ts` — the core computation job (440 lines)
- `actions/network/get-cross-org-matches.ts` — read matches with privacy filtering (275 lines)
- `actions/network/manage-network-settings.ts` — settings + partner CRUD
- `app/api/cron/cross-org-matches/route.ts` — Vercel Cron endpoint
- `lib/network/privacy-filter.ts` — discriminated union privacy filtering (220 lines)
- `lib/matchmaking/calculator.ts` — scoring engine
- `lib/matchmaking/weights.ts` — criterion weights configuration

---

### 4.5 Entity Sharing

**Purpose:** Share individual properties, clients, or documents with specific connections.

**Shareable entity types:** `PROPERTY` | `CLIENT` | `DOCUMENT`

**Permission levels:** `VIEW_ONLY` | `VIEW_COMMENT`

**Flow:**
1. User selects an entity to share
2. System verifies: target is an ACCEPTED connection
3. System verifies: user has access to the entity (assigned to them OR in their org)
4. Creates `SharedEntity` record with optional message
5. Fires `notifyEntityShared()` notification
6. Recipient sees the shared item in their Sharing Hub

**Access control rules:**
- Properties/Clients: user must be `assigned_to` OR in the same `organizationId`
- Documents: user must be `created_by_user` OR `assigned_user`
- Only the sharer can revoke a share
- Duplicate sharing (same entity + same recipient) is blocked

**Key files:**
- `actions/social/sharing.ts` — all sharing CRUD (8 exported functions)
- `app/[locale]/app/(routes)/network/messages/components/ShareEntityDialog.tsx` — in-message sharing UI
- `app/[locale]/app/(routes)/network/shared/` — legacy shared items view

---

### 4.6 Social Feed

**Purpose:** Org-scoped activity feed where agents can post updates linked to business entities.

**Post types:** `property` | `client` | `mandate` | `document` | `text`

**Features:**
- Posts can link to a specific entity (property, client, mandate, document) with auto-fetched title/metadata
- File attachments via the `Attachment` model
- Comments with nested replies (via `parentId` on `SocialPostComment`)
- Likes on posts (`SocialPostLike`)
- Real-time updates via Ably pub/sub
- Feed filtering (by type, date)
- Discovery sidebar suggesting agents/agencies to follow

**Visibility behavior:**
- Post visibility inherits from the author's `AgentProfile.visibility`:
  - PRIVATE → only connections see it
  - SECURE → authenticated users + connections
  - PUBLIC → everyone
- The post creation response includes the effective visibility so the UI can inform the author

**Ably integration:**
- When a post is created, a minimal event is published to the org's feed channel
- **Security note:** Ably events contain only IDs and timestamps — never decrypted PII (client names, entity titles, post content). Subscribers fetch full details via the API

**Key files:**
- `actions/social-feed/create-social-post.ts` — post creation with entity linking + Ably events
- `actions/social-feed/get-social-posts.ts` — paginated feed retrieval
- `actions/social-feed/comment-post.ts` — commenting
- `actions/social-feed/like-post.ts` — like/unlike
- `actions/social-feed/delete-social-post.ts` — post deletion
- `app/[locale]/app/(routes)/network/feed/` — feed UI (7 components)

---

### 4.7 Messaging with E2EE

**Purpose:** Secure direct messages and group channels between connected agents.

**Components:**
- `ConversationList` — list of DMs and channels
- `MessageThread` — view and send messages in a conversation
- `ThreadPanel` — threaded replies
- `MessageComposer` — message input with entity sharing
- `MessageSearch` — search across messages
- `CreateChannelDialog` — create group channels
- `StartDMDialog` — initiate a DM with a connection
- `E2EEOnboarding` — initial encryption key setup
- `ShareEntityDialog` — share properties/clients/docs in a message
- `ConversationSettings` — channel settings and members

**End-to-End Encryption:**
- Uses **Megolm ratchet** for group sessions (same protocol family as Matrix/Element)
- `GroupSession` and `DirectSession` models track encryption key state
- E2EE onboarding guides users through key generation and backup
- API routes at `/api/e2ee/prekey-bundle/[userId]` and `/api/e2ee/entity-sessions/[sessionId]/shares` support key exchange

**Key files:**
- `app/[locale]/app/(routes)/network/messages/` — 11 components + page
- `app/api/e2ee/` — E2EE key exchange endpoints

---

### 4.8 Sharing Hub

**Purpose:** Unified dashboard consolidating all sharing activity.

**Tabs:**

**"Shared With Me":**
- All items other users have shared with you via `SharedEntity`
- Filterable by type: Properties, Clients, Documents
- Shows sharer info and optional message

**"My Sharing":**
- Section 1: **Public Showcase** — properties marked PUBLIC on your agent profile
- Section 2: **In Polis Network** — SECURE/PUBLIC items participating in cross-org matchmaking
- Section 3: **Shared with Connections** — explicit `SharedEntity` records you've created

**Key files:**
- `app/[locale]/app/(routes)/network/sharing-hub/page.tsx`

---

## 5. Data Model

### Entity Relationship Diagram

```
Users (1) ──────── (0..1) AgentProfile
  │                         │
  │ followerId/followingId  │ profileId
  │                         ↓
  ├─── AgentConnection     ProfileShowcaseProperty ──── Properties
  │    (status: PENDING/                                    │
  │     ACCEPTED/REJECTED)                                  │
  │                                                         │
  │ sharedById/sharedWithId                                 │
  ├─── SharedEntity ───── entityId (polymorphic) ──────────┤
  │    (PROPERTY/CLIENT/DOCUMENT)                    (or Clients/Documents)
  │
  │ authorId
  ├─── SocialPost
  │    └── SocialPostComment (nested via parentId)
  │    └── SocialPostLike
  │
  └─── Conversation/Message (E2EE messaging)

Organization (1) ── (0..1) AgencyProfile
  │
  │ organizationId
  ├─── OrgNetworkSettings (membership, privacy levels)
  │
  │ initiatorOrgId / partnerOrgId
  ├─── OrgNetworkPartner (PENDING/ACCEPTED/REJECTED/REVOKED)
  │
  │ mandateOrgId / propertyOrgId
  └─── CrossOrgMatch (score, breakdown, TTL)
            │              │
            ↓              ↓
         Mandate       Properties
```

### Key Enums

| Enum | Values | Used By |
|---|---|---|
| `ItemVisibility` | HIDDEN, PRIVATE, SECURE, PUBLIC | Properties, Clients, Mandates |
| `ProfileVisibility` | PRIVATE, SECURE, PUBLIC | AgentProfile, AgencyProfile |
| `OrgNetworkMembership` | NONE, POOL, BILATERAL, BOTH | OrgNetworkSettings |
| `NetworkPrivacyLevel` | ANONYMIZED, AGENCY_IDENTIFIED, FULL | OrgNetworkSettings (per entity type) |
| `ConnectionStatus` | PENDING, ACCEPTED, REJECTED | AgentConnection |
| `OrgPartnerStatus` | PENDING, ACCEPTED, REJECTED, REVOKED | OrgNetworkPartner |
| `SharedEntityType` | PROPERTY, CLIENT, DOCUMENT | SharedEntity |
| `SharePermission` | VIEW_ONLY, VIEW_COMMENT | SharedEntity |

---

## 6. Scoring Engine — Matchmaking Algorithm

The scoring engine at `lib/matchmaking/calculator.ts` evaluates 15 criteria, each weighted to sum to 100:

### Criterion Weights

| Tier | Criterion | Weight | Logic |
|---|---|---|---|
| **Primary (70%)** | Budget | 26 | Range overlap between mandate budget and property price |
| | Location | 21 | Match on areas_of_interest, municipality, region |
| | Transaction type | 15 | Buy↔Sale, Rent↔Rental/Short-term alignment |
| | Property type | 8 | Apartment, House, etc. match |
| **Secondary (17%)** | Bedrooms | 8 | Range comparison (min/max) |
| | Size (sqm) | 7 | Range comparison with tolerance |
| | Amenities | 5 | Intersection of required vs available |
| **Tertiary (15%)** | Condition | 3 | Preference vs actual |
| | Furnished | 2 | Preference vs actual |
| | Floor | 2 | Range comparison |
| | Elevator | 1 | Required vs available |
| | Pet-friendly | 1 | Required vs available |
| | Heating | 0.5 | Preference vs actual |
| | Energy class | 0.3 | Minimum grade comparison |
| | Parking | 0.2 | Required vs available |

### Score Thresholds

| Quality | Score Range |
|---|---|
| Excellent | 85–100 |
| Good | 70–84 |
| Fair | 50–69 |
| Poor | 25–49 |
| Very poor | 0–24 |

### Cross-Org Adaptation

For Polis, mandates are adapted to the `ClientForMatching` interface via `adaptMandateToClient()`:
- `transaction_type` SALE → intent BUY, RENTAL/SHORT_TERM → intent RENT
- `areas_of_interest` + `municipality` + `region` merged into location array
- Amenities parsed from both JSON object (`{ pool: true }`) and array (`["pool"]`) formats
- All mandate-specific fields (bedrooms_min/max, size_min/max, etc.) mapped to `property_preferences`

---

## 7. Privacy & Visibility System

The module uses a **two-dimensional privacy model**:

### Dimension 1: Item Visibility (per record)

Controls whether an individual property/mandate/client enters the Polis system:

| Level | In Polis? | In Org Lists? | Effect |
|---|---|---|---|
| `HIDDEN` | No | Yes (browsable) | Completely excluded from matchmaking, analytics, cross-org |
| `PRIVATE` | No | Yes | Agency-only; participates in intra-org matchmaking |
| `SECURE` | Yes | Yes | Shared within Polis network (bilateral + pool matches) |
| `PUBLIC` | Yes | Yes | Polis + can appear on public agent profile showcase |

### Dimension 2: Network Privacy Level (per org, per entity type)

Controls **how much detail** other orgs see when they view a cross-org match:

| Level | Visible Data |
|---|---|
| `ANONYMIZED` | Specs only: property type, size, location, price/budget |
| `AGENCY_IDENTIFIED` | Specs + agency name + agency logo |
| `FULL` | Specs + agency name + logo + listing agent name + phone + friendlyId |

**Implementation:** Privacy filtering uses TypeScript **discriminated unions** (`FilteredProperty = AnonymizedProperty | AgencyIdentifiedProperty | FullProperty`). The `filterProperty()` and `filterMandate()` functions in `lib/network/privacy-filter.ts` accept raw DB data and return type-narrowed objects with only the fields appropriate for the configured level. This is applied at **read time**, meaning:

- Privacy level changes take effect immediately
- No recomputation of `CrossOrgMatch` rows needed
- The source org controls their own privacy level; the viewing org cannot override it

---

## 8. Security & Multi-Tenancy

### Tenant Isolation Patterns

| Context | Isolation Method |
|---|---|
| Network settings | `organizationId` unique constraint on `OrgNetworkSettings` |
| Bilateral partners | Explicit org ID pairs (`initiatorOrgId` / `partnerOrgId`) |
| Cross-org matches | `mandateOrgId` / `propertyOrgId` — queries always include `orgId` in the WHERE |
| Entity sharing | User-to-user (`sharedById` / `sharedWithId`) — not org-scoped |
| Social posts | `organizationId` on `SocialPost` — standard tenant filter |
| Connections | User-to-user — no org boundary (agents from any org can connect) |

### Data Protection Measures

1. **Encryption at rest** — mandates and properties use per-org DEK encryption. The cross-org job decrypts with the platform's master KEK, scores in memory, and never stores decrypted data in `CrossOrgMatch`
2. **HIDDEN/PRIVATE items never exposed** — the background job only fetches items with `visibility: { in: ["SECURE", "PUBLIC"] }`
3. **Default NONE** — orgs must explicitly opt into Polis; the default `membership` is `NONE`
4. **Connection-gated sharing** — entity sharing requires an ACCEPTED `AgentConnection`
5. **Ownership verification** — sharing checks `assigned_to` or `organizationId` before allowing a share
6. **Timing-safe cron auth** — the cron endpoint uses `timingSafeEqual` for token comparison
7. **Ably event sanitization** — real-time events carry only IDs, never decrypted PII
8. **Public profile projections** — `getPublicAgencyProfile()` explicitly selects fields, never returning `organizationId`, coordinates, or timestamps to public visitors

### Authorization

| Action | Required Permission |
|---|---|
| View network pages | `canAccessModule("network")` (feature flag check) |
| Update network settings | `admin:manage_org_settings` (ORG_OWNER or ADMIN) |
| Manage bilateral partners | `admin:manage_org_settings` |
| View cross-org matches | `matchmaking:view_analytics` |
| Create social posts | `social:create_post` |
| Send connection requests | Authenticated user (no specific permission) |
| Share entities | Authenticated + ACCEPTED connection + entity ownership |

---

## 9. Background Jobs & Infrastructure

### Cross-Org Match Computation (Cron)

| Property | Value |
|---|---|
| Endpoint | `GET /api/cron/cross-org-matches` |
| Schedule | Every 30 minutes |
| Auth | `CRON_SECRET` Bearer token (timing-safe) |
| Batch size | 10 orgs per parallel batch |
| Match TTL | 30 days (or mandate expiry date, whichever is sooner) |
| Cleanup | Expired rows deleted at end of each run |
| Logging | `[CRON cross-org-matches] upserted=N expired=N errors=N duration=Nms` |
| Error handling | Per-record try/catch — corrupted records skipped, counted in `errors` |

### Real-Time (Ably)

- Social feed posts publish to org-scoped channels: `social-feed:{orgId}`
- Messaging uses Ably for real-time message delivery and typing indicators
- **Degradation:** If Ably is not configured (missing env var), real-time features silently degrade

### Notifications

Triggered by:
- Connection requests (sent + accepted)
- Entity sharing
- Feed mentions (future)

Delivered via the `Notification` model with in-app + email channels (per-user `NotificationSettings`).

---

## 10. Feature Gating

The Network Module is **disabled by default** for all organizations.

**Gating chain:**

```
1. ModuleId type includes "network"
2. OrganizationFeature table: (organizationId, "network", isEnabled)
3. canAccessModule("network") checks OrganizationFeature
4. Navigation items check canAccess("network") before rendering
5. Network layout.tsx redirects to /dashboard if check fails
6. Platform Admin can toggle via toggleNetworkFeature() action
```

**Effect of disabling:** All network routes redirect to dashboard. Navigation items hidden. Background jobs still run (they simply find no participating orgs if all are disabled). No data is deleted.

---

## 11. Technology Stack & Patterns

| Layer | Technology | Usage |
|---|---|---|
| Framework | Next.js 16 (App Router) | Routes, RSC, Server Actions |
| Database | PostgreSQL via Prisma | All data models |
| Auth | Clerk v6 (async `auth()`) | User/org identity, roles |
| Real-time | Ably | Social feed updates, messaging |
| Encryption | Per-org DEK + master KEK | Server-side field encryption |
| E2EE | Megolm ratchet | Message encryption |
| Background jobs | Vercel Cron | 30-min match computation |
| Search | Prisma `contains` (case-insensitive) + `hasSome` (array overlap) | Agent/agency discovery |
| Pagination | Cursor-based (`skip: 1, cursor: { id }`) | All discovery/list endpoints |
| State management | SWR (client-side) | Connections, feed, messages |
| Notifications | Custom notification system | In-app + email |
| Validation | Zod schemas | All mutation inputs |

### Code Patterns

- **Server Actions** follow the project-wide pattern: `"use server"` → permission guard → get org context → validate → execute → return `ActionResponse`
- **Privacy filtering** uses TypeScript discriminated unions for type-safe field stripping
- **Race condition protection** via P2002 unique constraint catch (connections, sharing)
- **Batch processing** for cross-org computation (10 orgs per parallel batch)
- **Adapter pattern** for converting mandates to the scoring engine's input format
- **Read-time filtering** instead of materialized views for privacy (simpler, instant propagation)

---

## 12. File Inventory

### Routes & Pages (50 files)

```
app/[locale]/app/(routes)/network/
├── page.tsx                          — Main network hub
├── layout.tsx                        — Feature gate (redirect if disabled)
├── components/
│   ├── ConnectionsList.tsx           — Connections list
│   ├── NetworkAgentCard.tsx          — Agent card in discovery
│   ├── NetworkAgencyCard.tsx         — Agency card in discovery
│   ├── NetworkFeed.tsx               — Feed preview on hub
│   ├── NetworkPageClient.tsx         — Hub client component
│   └── PendingRequestsList.tsx       — Pending requests
├── feed/
│   ├── page.tsx
│   ├── loading.tsx
│   └── components/
│       ├── FeedPage.tsx
│       ├── FeedPostCard.tsx
│       ├── FeedPostComposer.tsx
│       ├── FeedPostEngagement.tsx
│       ├── FeedCommentThread.tsx
│       ├── FeedFilters.tsx
│       ├── FeedDiscoverySidebar.tsx
│       ├── FeedDiscoveryCard.tsx
│       └── FeedAttachmentDialog.tsx
├── profile/
│   ├── page.tsx
│   ├── loading.tsx
│   └── components/
│       ├── ProfilePage.tsx
│       ├── ProfileHeader.tsx
│       └── tabs/
│           ├── ProfileEditTab.tsx
│           ├── ShowcaseTab.tsx
│           ├── ProfilePreviewTab.tsx
│           └── ConnectionsTab.tsx
├── messages/
│   ├── page.tsx
│   ├── loading.tsx
│   └── components/
│       ├── MessagesPage.tsx
│       ├── ConversationList.tsx
│       ├── ConversationSettings.tsx
│       ├── MessageThread.tsx
│       ├── ThreadPanel.tsx
│       ├── MessageComposer.tsx
│       ├── MessageSearch.tsx
│       ├── CreateChannelDialog.tsx
│       ├── StartDMDialog.tsx
│       ├── E2EEOnboarding.tsx
│       ├── ShareEntityDialog.tsx
│       └── index.ts
├── agents/[username]/
│   ├── page.tsx
│   └── components/
│       ├── AgentProfileInApp.tsx
│       └── AgentProfileActions.tsx
├── shared/
│   ├── page.tsx
│   └── components/
│       └── SharedEntitiesList.tsx
└── sharing-hub/
    └── page.tsx

app/[locale]/app/(routes)/settings/network/
├── page.tsx
└── components/
    └── NetworkSettingsClient.tsx

app/[locale]/app/(platform_admin)/platform-admin/network/
└── page.tsx
```

### Server Actions (15 files)

```
actions/network/
├── compute-cross-org-matches.ts      — Background job logic
├── get-cross-org-matches.ts          — Read matches with privacy filtering
├── get-my-network-items.ts           — Fetch own SECURE/PUBLIC items
├── manage-network-settings.ts        — Settings + partner CRUD
├── discover-agents.ts                — Agent discovery search
└── discover-agencies.ts              — Agency discovery search

actions/social/
├── connections.ts                    — Connection CRUD (7 functions)
├── profile.ts                        — Agent profile CRUD
├── showcase.ts                       — Showcase property management
└── sharing.ts                        — Entity sharing CRUD (8 functions)

actions/social-feed/
├── create-social-post.ts             — Post creation with Ably
├── get-social-posts.ts               — Paginated feed retrieval
├── get-post-by-id.ts                 — Single post fetch
├── comment-post.ts                   — Comment CRUD
├── like-post.ts                      — Like/unlike
├── delete-social-post.ts             — Post deletion
└── get-shareable-items.ts            — Available items for sharing

actions/organization/
└── agency-profile.ts                 — Agency profile CRUD
```

### Libraries (5 files)

```
lib/network/
└── privacy-filter.ts                 — Discriminated union privacy filtering

lib/matchmaking/
├── calculator.ts                     — 15-criterion scoring engine
├── weights.ts                        — Weight configuration (sum = 100)
├── normalizers.ts                    — Data normalization helpers
└── types.ts                          — TypeScript interfaces
```

### API Routes (3 files)

```
app/api/cron/cross-org-matches/route.ts    — Vercel Cron endpoint
app/api/e2ee/prekey-bundle/[userId]/route.ts — E2EE key exchange
app/api/e2ee/entity-sessions/[sessionId]/shares/route.ts — E2EE session sharing
```

### Translations (2 files)

```
locales/en/network.json               — English translations
locales/el/network.json               — Greek translations
```

---

## 13. Integration Points

### Internal (within Oikion)

| System | Integration |
|---|---|
| **MLS** | Properties appear in showcase, sharing, Polis matching, feed posts |
| **CRM** | Clients shareable with connections, linkable in feed posts |
| **Mandates** | Core input to Polis matching engine |
| **Documents** | Shareable with connections, linkable in feed posts |
| **Deals** | Linkable in feed posts |
| **Encryption** | `decryptMandateForOrg()` / `decryptPropertyForOrg()` for cross-org scoring |
| **Notifications** | Connection requests, acceptances, entity sharing |
| **Permissions** | Module access via `canAccessModule("network")`, action guards for mutations |
| **Clerk** | Agency profile name/slug sync, user identity, org membership |

### External Services

| Service | Usage |
|---|---|
| **Ably** | Real-time social feed events, messaging |
| **Vercel Cron** | 30-min cross-org match computation |
| **Clerk** | Organization identity (name, slug) synced to AgencyProfile |

---

## 14. Known Limitations & Technical Debt

### Architectural

1. **`@ts-nocheck` on calculator.ts** — The matchmaking calculator has TypeScript errors suppressed. These should be resolved for type safety
2. **N+1 queries in getCrossOrgMatches** — Agent info is loaded per-match with individual `loadAgentInfo()` calls instead of batched. With 100 matches, this could be up to 200 extra queries
3. **No indexing on discovery queries** — `contains` (case-insensitive) and `hasSome` on array fields may not leverage indexes at scale
4. **Match computation is O(M×P×O²)** — For each mandate org, scoring runs against all properties from all eligible orgs. As the network grows, this could exceed the cron timeout
5. **No incremental matching** — The job recomputes ALL matches every run rather than only processing new/changed items since the last run

### Feature Gaps

6. **No match dashboard UI** — `getCrossOrgMatches()` action exists but there's no dedicated page to display results (the hub page shows connections and feed, not matches)
7. **Agency discovery page** — `discoverAgencies()` action exists but the discovery UI focus is on agents
8. **No match notifications** — When a high-score match is found, there's no notification to alert the org
9. **No match actions** — After seeing a match, there's no "Express Interest" or "Request Introduction" flow
10. **Contact form submissions** — `AgentContactSubmission` and `AgencyContactSubmission` models exist but the public submission flow is not fully wired

### Security & Privacy

11. **Sharing bypasses org boundary** — `SharedEntity` is user-to-user with no org check. An agent could share their org's data with anyone they're connected to, even after leaving the org
12. **No audit trail on privacy level changes** — When an org changes their privacy level, there's no log of the previous setting
13. **Phone number not populated in FULL mode** — `getCrossOrgMatches()` sets `propertyAgentPhone: null` even at FULL privacy level (the Users model may not have a phone field)
14. **Social feed org scope** — Posts use `organizationId` but the feed may show posts from other orgs if the user has connections there (depends on feed query implementation)
