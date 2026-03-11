# Comprehensive Test Seed — Design Spec

**Date**: 2026-03-11
**Status**: Draft
**File**: `scripts/seed-test-data.ts`

## Purpose

A single, comprehensive seed script that creates realistic, interlinked test data across two organizations to exercise every major feature of the Oikion platform: MLS, CRM, Mandates, Deals, Matchmaking (cross-org Polis), Feed (posts/likes/comments/replies), Messaging (channels + DMs including cross-org), Documents, Calendar Events, Tasks, Sharing, Notifications, Agent Profiles, and Network settings.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Org count | 2 ("Alpha" + "Beta") | Minimum to test cross-org matchmaking, sharing, network, inter-agency DMs |
| User handling | Hybrid (real Clerk + synthetic DB-only) | Real users can log in; synthetic departed/inactive users test null-safety |
| Data volume | Lean (~50-80 per entity type across both orgs) | Scenario-driven coverage, not load testing |
| Document files | Placeholder URLs | Tests document management UI without blob storage dependency |
| Idempotency | Purge-and-recreate | Clean, reproducible state; `--skip-purge` flag for append mode |
| Encryption | Inline AES-256-GCM per-org DEK | Same pattern as `seed-demo-showcase.ts`, self-contained |

## CLI Interface

```bash
npx tsx scripts/seed-test-data.ts \
  --alpha-user <clerk_user_id> \
  --beta-user <clerk_user_id> \
  [--skip-purge]
```

- `--alpha-user` — Real Clerk user ID in Organization Alpha
- `--beta-user` — Real Clerk user ID in Organization Beta
- `--skip-purge` — Skip data purge, append to existing data

### Execution Flow

1. Parse CLI args, validate both Clerk user IDs
2. Resolve each user → organization ID + real teammate list (via Clerk API)
3. Purge both orgs' data in dependency order (unless `--skip-purge`)
4. Ensure/create `OrgEncryptionKey` for both orgs
5. Create synthetic (DB-only) users per org
6. Seed entities in dependency order with encryption
7. Print summary report

## Entity Inventory

### Per-Org Totals

| Entity | Per Org | Total | Notes |
|--------|---------|-------|-------|
| Synthetic Users | 2-3 | 4-6 | Departed, inactive, GDPR-deleted |
| Clients | 15 | 30 | All ClientType, ClientStatus, ItemVisibility combos |
| Properties | 20 | 40 | All PropertyType, PropertyStatus combos |
| Mandates | 11 | 22 | All MandateStatus (incl. CANCELLED), cross-org match targets |
| Deals | 6 | 12 | Full lifecycle (incl. ACCEPTED), cross-org |
| Documents | 8 | 16 | All DocumentSystemType values |
| Calendar Events | 10 | 20 | All CalendarEventType values |
| Tasks | 8 | 16 | Overdue, upcoming, completed, departed-agent |
| Comments | ~60 | ~120 | PropertyComment, ClientComment (unencrypted — no encrypt helper exists), MandateComment, TaskComment |
| Social Posts | 12 | 24 | With likes, comments, threaded replies, attachments |
| Channels | 3 | 6 | PUBLIC, PRIVATE, ANNOUNCEMENT |
| Conversations | — | 5 | 2 org DMs, 1 group DM, 1 cross-org, 1 departed-user |
| Messages | ~25 | ~50 | Threads, reactions, attachments, mentions, read receipts |
| Shared Entities | — | 5 | Cross-agent, cross-org, departed-user |
| Agent Connections | — | 4 | ACCEPTED, PENDING, REJECTED |
| Agent Profiles | — | 4 | With showcase properties |
| Notifications | 15 | 30 | All major NotificationCategory values |
| CrossOrgMatches | — | 3-4 | Pre-computed with scores and `expiresAt` (future date) |
| Property Showings | 6 | 12 | All ShowingResult values, each with required `agentId` (Clerk userId) |
| Property Images | 3-5 | 6-10 | Placeholder URLs, position/isPrimary, linked to properties with cascading delete |
| Agency Profiles | — | 2 | One per org, with contact form enabled |
| Agent Contact Submissions | — | 3-4 | Mix of NEW, READ, CONTACTED statuses |
| Network Settings | — | 2 orgs + 1 partnership | Bilateral matching enabled |

### Synthetic Users (per org)

| User | Status | Purpose |
|------|--------|---------|
| `Departed Agent` | Left org | Tests `assigned_to → null`, `DepartureReason.LEFT_ORG` |
| `Inactive Agent` | INACTIVE | Tests status-based filtering |
| `Deleted Agent` | GDPR-deleted | Tests `DepartureReason.ACCOUNT_DELETED` |

All have fake `clerkUserId` (e.g., `user_seed_alpha_departed`). Created with `userStatus: INACTIVE` or minimal records.

### Clients (15 per org)

| # | Scenario | client_type | client_status | visibility | Special |
|---|----------|-------------|---------------|------------|---------|
| 1-2 | Active buyers, full contact info | BUYER | ACTIVE | PERSONAL | Full phone/email/address |
| 3-4 | Sellers linked to properties | SELLER | ACTIVE | SECURE | Linked via Client_Properties |
| 5 | Renter with mandate | RENTER | LEAD | PERSONAL | Linked via Mandate_Clients |
| 6 | Investor with multiple properties | INVESTOR | ACTIVE | PUBLIC | 4+ Client_Properties links |
| 7 | Referral partner (company) | REFERRAL_PARTNER | CONVERTED | SECURE | person_type: COMPANY |
| 8 | Lost lead | BUYER | LOST | PERSONAL | Funnel testing |
| 9 | Draft client (incomplete) | BUYER | LEAD | PERSONAL | draft_status: true, still requires `client_name` (NOT NULL) |
| 10 | Assigned to departed agent | SELLER | ACTIVE | PERSONAL | assigned_to → departed user |
| 11-12 | Shared cross-org | BUYER | ACTIVE | SECURE | SharedEntity records |
| 13 | Company with full billing/shipping | INVESTOR | ACTIVE | PUBLIC | All address fields |
| 14 | Greek-specific fields | SELLER | ACTIVE | PERSONAL | AFM, DOY, GEMI filled |
| 15 | Inactive client | BUYER | INACTIVE | PERSONAL | Status filtering test |

### Properties (20 per org)

| # | Scenario | property_type | property_status | visibility | Special |
|---|----------|---------------|-----------------|------------|---------|
| 1-3 | Active apartments (Athens) | APARTMENT | ACTIVE | PUBLIC | Varied floors/sizes/prices |
| 4-5 | Houses (suburbs) | HOUSE | ACTIVE | SECURE | One with full amenities |
| 6 | Maisonette | MAISONETTE | ACTIVE | PUBLIC | Less common type test |
| 7 | Commercial warehouse | WAREHOUSE | ACTIVE | SECURE | transaction_type: SALE |
| 8 | Land plot | PLOT | ACTIVE | PUBLIC | plot_size_sqm required |
| 9 | Sold property | APARTMENT | SOLD | PERSONAL | Linked to completed deal |
| 10 | Pending (offer stage) | HOUSE | PENDING | PERSONAL | Active deal attached |
| 11 | Off-market | APARTMENT | OFF_MARKET | PERSONAL | — |
| 12 | Withdrawn | COMMERCIAL | WITHDRAWN | PERSONAL | — |
| 13 | Rental property | APARTMENT | ACTIVE | PUBLIC | transaction_type: RENTAL |
| 14 | Short-term rental | VACATION | ACTIVE | SECURE | transaction_type: SHORT_TERM |
| 15 | Draft property | HOUSE | ACTIVE | PERSONAL | draft_status: true |
| 16 | Departed agent assigned | APARTMENT | ACTIVE | PERSONAL | assigned_to → departed |
| 17 | Full legal docs | APARTMENT | ACTIVE | SECURE | KAEK, permits, registry |
| 18 | Luxury (high price) | HOUSE | ACTIVE | PUBLIC | Full amenities, description |
| 19-20 | **Matchmaking targets** | APT/HOUSE | ACTIVE | SECURE | Kolonaki, 80-120sqm, €200k-350k |

### Mandates (10 per org)

| # | Scenario | urgency | status | visibility | Special |
|---|----------|---------|--------|------------|---------|
| 1-2 | Active buyer mandates | MEDIUM | ACTIVE | SECURE | Match Alpha SECURE properties |
| 3 | High-urgency immediate | CRITICAL | ACTIVE | SECURE | timeline: IMMEDIATE |
| 4 | Rental mandate | LOW | ACTIVE | PERSONAL | transaction_type: RENTAL |
| 5 | Fulfilled mandate | MEDIUM | FULFILLED | PERSONAL | Linked to completed deal |
| 6 | Expired mandate | LOW | EXPIRED | PERSONAL | expires_at in past |
| 7 | Draft mandate | MEDIUM | DRAFT | PERSONAL | draft_status: true |
| 8 | Paused mandate | HIGH | PAUSED | PERSONAL | — |
| 9 | Cancelled mandate | LOW | CANCELLED | PERSONAL | Covers CANCELLED status |
| 10 | Land search | MEDIUM | ACTIVE | PUBLIC | property_type: PLOT |
| 11 | **Cross-org match** | HIGH | ACTIVE | SECURE | Kolonaki, 70-130sqm, €180k-400k |
### Deals (6 per org)

| # | status | Scenario |
|---|--------|----------|
| 1 | COMPLETED | SOLD property + CONVERTED client, closedAt, commission splits |
| 2 | IN_PROGRESS | Both agents assigned, active negotiation |
| 3 | ACCEPTED | Accepted offer, pending paperwork |
| 4 | NEGOTIATING | Early stage |
| 5 | PROPOSED | Cross-org deal (Beta agent proposed on Alpha property) |
| 6 | CANCELLED | Fallen-through for history |

### Documents (8 per org)

| # | system_type | Linked To |
|---|-------------|-----------|
| 1 | CONTRACT | Completed deal property + client |
| 2 | INVOICE | Same deal |
| 3 | OFFER | Negotiating deal property |
| 4 | RECEIPT | Completed deal |
| 5 | OTHER (floor plan) | Luxury property |
| 6 | OTHER (client ID) | Company client |
| 7 | CONTRACT (lease) | Rental property |
| 8 | OTHER (energy cert) | Property with legal docs |

All use placeholder URLs with realistic filenames, mimeTypes, and sizes.

### Calendar Events (10 per org)

| # | eventType | Linked To |
|---|-----------|-----------|
| 1-3 | PROPERTY_VIEWING | Property + Client, attendee info |
| 4 | CLIENT_CONSULTATION | Client, past date |
| 5 | MEETING | Team meeting, no entity link |
| 6 | REMINDER | Follow-up, linked to mandate |
| 7 | TASK_DEADLINE | Linked to task |
| 8 | OTHER | General event |
| 9 | PROPERTY_VIEWING | Future viewing (upcoming) |
| 10 | PROPERTY_VIEWING | Past viewing with showing result |

Each event gets:
- **Unique `calendarEventId`** (auto-incrementing Int per org, starting from 1000 for Alpha, 2000 for Beta — required because `@unique` constraint with `@default(0)` causes collisions)
- `reminderMinutes: [30, 60]`
- 1-2 `EventInvitee` records
- 1-2 `CalendarReminder` records (PENDING/SENT mix)

### Tasks (8 per org)

| # | Scenario |
|---|----------|
| 1 | Overdue (past due date), linked to client |
| 2 | Upcoming, linked to calendar event |
| 3 | Completed, with 3 task comments |
| 4 | High-priority, assigned to real user |
| 5 | Assigned to departed agent (null test) |
| 6 | With document attachments |
| 7 | Unassigned (backlog) |
| 8 | Property showing follow-up |

Each with 1-3 `crm_Accounts_Tasks_Comments`.

### Property Showings (6 per org)

Mix of all `ShowingResult` values: NO_SHOW, NO_INTEREST, INTERESTED, VERY_INTERESTED, OFFER_MADE, CONTRACT_SIGNED. Duration 15-90 minutes. Each requires `agentId` (non-nullable String, stores Clerk userId — no FK relation, raw string).

### Social Feed (12 posts per org)

| # | postType | Engagement |
|---|----------|------------|
| 1 | property_listed | 4 likes, 3 comments (1 threaded reply) |
| 2 | deal_closed | 5 likes, 2 comments |
| 3 | client_converted | 2 likes |
| 4 | general (team update) | 3 comments |
| 5 | property_sold | 3 likes |
| 6 | milestone | 2 likes, 1 comment |
| 7 | property_listed (luxury) | 5 likes, 4 comments (2 threaded replies) |
| 8 | general (market insight) | 1 comment |
| 9 | property_listed (departed agent) | 1 like |
| 10 | general (with attachment) | Attachment record |
| 11 | deal_closed (cross-org) | 3 likes, 2 comments |
| 12 | general (oldest post) | Pagination boundary test |

### Messaging

**Channels (3 per org):**
- `#general` (PUBLIC) — default, all members, 8-10 messages
- `#management` (PRIVATE) — owner + leads, 3-4 messages
- `#announcements` (ANNOUNCEMENT) — 2 messages

**Conversations (5 total):**
- 2 org-scoped 1:1 DMs (one per org, 4-6 messages each)
- 1 org-scoped group DM (3 Alpha agents, 4 messages)
- 1 cross-org SHARED DM (Alpha ↔ Beta, 6+ messages about a deal)
- 1 DM with departed user (3 messages, null sender test)

**Message features:**
- Thread: 1 channel message with 3 `parentId` replies
- Reactions: `MessageReaction` — 👍 🏠 on 3-4 messages
- Attachments: `MessageAttachment` on 2 messages
- Mentions: `MessageMention` on 3-4 messages
- Read receipts: `MessageRead` for ~60% of messages

### Shared Entities (5 total)

| # | entityType | Scenario |
|---|-----------|----------|
| 1 | PROPERTY | Alpha shares luxury property with Beta (VIEW_COMMENT) |
| 2 | PROPERTY | Alpha shares apartment with Beta (VIEW_ONLY) |
| 3 | CLIENT | Shared referral partner |
| 4 | DOCUMENT | Contract shared for review |
| 5 | PROPERTY | Shared by departed user (null sharedById test) |

### Agent Connections (4 total)

- 2 × ACCEPTED (Alpha ↔ Beta real users)
- 1 × PENDING (Beta → Alpha secondary)
- 1 × REJECTED (history)

### Agent Profiles (4 total)

One per real Clerk user. Fields: bio, specializations, serviceAreas, languages, yearsExperience, socialLinks. Visibility: 2 PUBLIC, 1 SECURE, 1 PERSONAL. Each PUBLIC profile gets 2-3 `ProfileShowcaseProperty` links.

### Agency Profiles (2 total)

One per org. Fields: name, slug, logo (placeholder), description, phone, email, website, address, city, region, postalCode, country, latitude, longitude, socialLinks. Both with `contactFormEnabled: true` and `contactFormFields` JSON config.

### Agent Contact Submissions (3-4 total)

| # | Status | Scenario |
|---|--------|----------|
| 1 | NEW | Fresh inquiry on Alpha agent profile |
| 2 | READ | Read but not yet contacted |
| 3 | CONTACTED | Follow-up completed |
| 4 | ARCHIVED | Old submission |

### Property Images (3-5 per org)

Linked to 3-5 properties (luxury property gets 3 images, matchmaking targets get 1-2 each). Fields: `url` (placeholder), `position`, `isPrimary`, `caption`, `width`, `height`, `fileSize`, `mimeType`, `originalFileName`. Uses `https://placehold.co/` URLs.

### Notifications (15 per org)

Categories covered: PROPERTY_CREATED, PROPERTY_UPDATED, PROPERTY_ASSIGNED, CLIENT_CREATED, CLIENT_ASSIGNED, DEAL_PROPOSED, DEAL_ACCEPTED, DEAL_COMPLETED, ACCOUNT_TASK_CREATED, TASK_ASSIGNED, CALENDAR_REMINDER, SOCIAL_POST_LIKED, SOCIAL_POST_COMMENTED, DOCUMENT_SHARED, CALENDAR_EVENT_INVITED, SYSTEM.

~40% marked `read: true` with `readAt`.

### Network & Matchmaking

- `OrgNetworkSettings` for both orgs: `membership: BOTH`, `shareProperties: true`, `shareMandates: true`
  - Alpha: `propertyPrivacyLevel: AGENCY_IDENTIFIED`, `mandatePrivacyLevel: AGENCY_IDENTIFIED`
  - Beta: `propertyPrivacyLevel: FULL`, `mandatePrivacyLevel: FULL`
- `OrgNetworkPartner`: Alpha ↔ Beta, status: ACCEPTED
- `CrossOrgMatch`: 3-4 records (all with `expiresAt` set to 30 days from seed run — required non-nullable DateTime)
  - Beta mandate #11 → Alpha property #19 (score: 92, breakdown: `{location: 95, size: 90, budget: 88, type: 95}`)
  - Beta mandate #11 → Alpha property #20 (score: 85, breakdown: `{location: 95, size: 80, budget: 82, type: 85}`)
  - Alpha mandate #1 → Beta property (score: 78, breakdown: similar)
  - Alpha mandate #3 → Beta property (score: 75, breakdown: similar)

## Encryption

Uses the same inline AES-256-GCM pattern as `seed-demo-showcase.ts`:

1. Check/create `OrgEncryptionKey` per org (DEK encrypted with `SECRETS_ENCRYPTION_KEY`)
2. Before `createMany()`, encrypt sensitive fields per model:
   - **Clients**: 25 string fields via `CLIENT_ENCRYPTED_STRING_FIELDS` (client_name, full_name, company_name, company_id, primary_email, secondary_email, primary_phone, secondary_phone, office_phone, fax, afm, vat, doy, id_doc, company_gemi, description, billing_street, billing_city, billing_state, billing_postal_code, billing_country, shipping_street, shipping_city, shipping_state, shipping_postal_code) + 1 JSON field (`communication_notes` via `encryptJsonWithKey`)
   - **Properties**: 1 string field (primary_email) + 1 JSON field (communication_notes via `encryptJsonWithKey`)
   - **Mandates**: 2 string fields via `MANDATE_ENCRYPTED_STRING_FIELDS` (title, notes) + 1 JSON field (communication_notes via `encryptJsonWithKey`)
   - **Calendar Events**: 6 fields (title, description, location, attendeeEmail, attendeeName, notes)
   - **Documents**: 2 fields (document_name, description)
   - **PropertyComment, MandateComment**: content field (via `encryptPropertyCommentForOrg`, `encryptMandateCommentForOrg`)
   - **ClientComment**: content field stored **unencrypted** (no encrypt helper exists in `model-encryption.ts`)
3. Format: `iv:authTag:ciphertext` (hex, colon-delimited)
4. Idempotent: `isEncrypted()` guard

## Purge Strategy

Delete in dependency order (children before parents), all filtered by `organizationId` unless noted:

1. MessageReaction, MessageRead, MessageMention, MessageAttachment (via message → channel/conversation → org)
2. Messages
3. ChannelMember, ConversationParticipant, ConversationOrgMembership
4. Channels, Conversations
5. SocialPostLike, SocialPostComment, Attachment (social)
6. SocialPost
7. PropertyComment, ClientComment, MandateComment
8. crm_Accounts_Tasks_Comments → crm_Accounts_Tasks
9. CalendarReminder, EventInvitee → CalendarEvent
10. PropertyShowing
11. **Deal** (must be before Properties and Clients — `propertyId`/`clientId` FKs default to Restrict)
12. Client_Properties, Mandate_Properties, Mandate_Clients (join tables)
13. PropertyImage (cascades from Properties, but explicit delete is cleaner)
14. DocumentView → Documents
15. SharedEntity
16. Notification
17. AgentContactSubmission → ProfileShowcaseProperty → AgentProfile
18. AgencyContactSubmission → AgencyProfile
19. AgentConnection — **requires user ID lookup first**: get all org user IDs (real + synthetic), then `deleteMany({ where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] } })`
20. CrossOrgMatch, OrgNetworkPartner, OrgNetworkSettings
21. **Mandates** (before Properties/Clients, after join tables removed)
22. **Properties** (after Deals, join tables, images removed)
23. **Clients** (after Deals, join tables removed)
24. Synthetic Users — `deleteMany({ where: { clerkUserId: { startsWith: "user_seed_" } } })`

## Environment Requirements

- `DATABASE_URL` — PostgreSQL connection (direct or Accelerate)
- `CLERK_SECRET_KEY` — for resolving users/orgs
- `SECRETS_ENCRYPTION_KEY` — 64 hex chars for master KEK

## Greek Realism

All seed data uses Greek-realistic values:
- **Locations**: Athens neighborhoods (Kolonaki, Kifisia, Glyfada, Marousi, Pagrati, Chalandri, Psychiko, Vouliagmeni)
- **Names**: Greek names (Παπαδόπουλος, Αντωνίου, Δημητρίου, etc.) with English transliterations
- **Addresses**: Real Athens streets (Λεωφ. Κηφισίας, Βασ. Σοφίας, Ερμού, etc.)
- **Prices**: EUR, realistic Athens market ranges (€80k-€2M for sales, €400-€3000/mo for rentals)
- **AFM**: 9-digit Greek tax IDs
- **Postal codes**: 5-digit Greek format (104xx-166xx for Athens)
- **Phone numbers**: +30 format

## Output

Script prints a summary table on completion:
```
✓ Seed complete for 2 organizations
  Alpha (org_xxx): 15 clients, 20 properties, 10 mandates, ...
  Beta  (org_yyy): 15 clients, 20 properties, 10 mandates, ...
  Cross-org: 4 matches, 5 shared entities, 1 partnership, 4 connections
  Total time: XXs
```
