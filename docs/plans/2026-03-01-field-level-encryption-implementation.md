# Field-Level Encryption Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Encrypt all sensitive PII, message content, AI conversation history, calendar details, and document metadata stored in the database, so that plain-text is never visible via Prisma DB Panel or direct DB access.

**Architecture:** Extend the existing server-side AES-256-GCM encryption (`lib/encryption.ts`) with typed per-model helper functions in a new `lib/model-encryption.ts`. Each server action that reads or writes sensitive data calls the appropriate helper. A one-time migration script encrypts all existing data.

**Tech Stack:** Node.js `crypto` (already in `lib/encryption.ts`), Prisma ORM, TypeScript, `tsx` to run scripts.

---

## Prerequisites

Ensure `SECRETS_ENCRYPTION_KEY` is set in `.env`:
```bash
openssl rand -hex 32
# Paste output into .env as: SECRETS_ENCRYPTION_KEY=<64-hex-chars>
```

If it's not set, `lib/encryption.ts` will throw at runtime.

---

## How the existing encryption works (READ THIS FIRST)

`lib/encryption.ts` already implements AES-256-GCM:

```typescript
encrypt("hello")  // → "a1b2c3...iv:authTag:ciphertext" (hex string, unique each call)
decrypt("a1b2c3...") // → "hello"
isEncrypted("a1b2c3...") // → true (checks iv+authTag length)
```

`isEncrypted()` detects format: `parts.length === 3`, `iv.length === 32`, `authTag.length === 32`. This is how we skip already-encrypted values.

`encrypt()` already handles empty strings (returns as-is). But it takes `string`, not `string | null`.

---

## Task 1: Create `lib/model-encryption.ts`

**Files:**
- Create: `lib/model-encryption.ts`

This is the core of the implementation. All other tasks just call these helpers.

**Step 1: Create the file with all helpers**

```typescript
/**
 * lib/model-encryption.ts
 *
 * Typed field-level encryption helpers per model.
 * Each helper encrypts/decrypts only the fields present in the input (Partial-safe).
 * JSON fields are serialized to string before encryption (sentinel prefix: value starts
 * with encrypted format iv:auth:ct when isEncrypted returns true).
 *
 * Usage on WRITE: const encrypted = encryptClient(data); await prismadb.clients.create({ data: encrypted });
 * Usage on READ:  const record = await prismadb.clients.findFirst(...); return decryptClient(record);
 */

import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Encrypt a string field, handling null/undefined gracefully */
function encryptField(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (isEncrypted(value)) return value; // idempotent
  return encrypt(value);
}

/** Decrypt a string field, handling null/undefined gracefully */
function decryptField(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  if (!isEncrypted(value)) return value; // legacy plain-text or empty
  return decrypt(value);
}

/** Encrypt a JSON value by serialising to string first */
function encryptJson(value: Prisma.JsonValue | null | undefined): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (isEncrypted(str)) return value; // already encrypted string stored as JSON
  const encrypted = encrypt(str);
  return encrypted as Prisma.JsonValue; // stored as JSON string
}

/** Decrypt a JSON value that was encrypted as a string */
function decryptJson(value: Prisma.JsonValue | null | undefined): Prisma.JsonValue | null | undefined {
  if (value == null) return value;
  if (typeof value === "string" && isEncrypted(value)) {
    const decrypted = decrypt(value);
    try {
      return JSON.parse(decrypted) as Prisma.JsonValue;
    } catch {
      return decrypted as Prisma.JsonValue;
    }
  }
  return value; // legacy unencrypted JSON object
}

// ─────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────

const CLIENT_ENCRYPTED_STRING_FIELDS = [
  "client_name",
  "primary_email",
  "secondary_email",
  "primary_phone",
  "secondary_phone",
  "afm",
  "vat",
  "id_doc",
  "description",
  "billing_street",
  "billing_city",
  "billing_state",
  "billing_postal_code",
  "billing_country",
  "shipping_street",
  "shipping_city",
  "shipping_state",
  "shipping_postal_code",
  "shipping_country",
] as const;

type ClientStringField = (typeof CLIENT_ENCRYPTED_STRING_FIELDS)[number];
type ClientWithEncryptedFields = Partial<Record<ClientStringField, string | null | undefined>> & {
  communication_notes?: Prisma.JsonValue | null;
};

export function encryptClient<T extends ClientWithEncryptedFields>(data: T): T {
  const result = { ...data } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptField(
        result[field] as string | null | undefined
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes);
  }
  return result as T;
}

export function decryptClient<T extends ClientWithEncryptedFields>(record: T): T {
  const result = { ...record } as T & ClientWithEncryptedFields;
  for (const field of CLIENT_ENCRYPTED_STRING_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptField(
        result[field] as string | null | undefined
      );
    }
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJson(result.communication_notes);
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────

type MessageWithContent = { content?: string };

export function encryptMessage<T extends MessageWithContent>(data: T): T {
  if (!("content" in data)) return data;
  return { ...data, content: encryptField(data.content) as string };
}

export function decryptMessage<T extends MessageWithContent>(record: T): T {
  if (!("content" in record)) return record;
  return { ...record, content: decryptField(record.content) as string };
}

// ─────────────────────────────────────────────
// CalendarEvent
// ─────────────────────────────────────────────

const CALENDAR_ENCRYPTED_FIELDS = [
  "title",
  "description",
  "location",
  "attendeeEmail",
  "attendeeName",
  "notes",
] as const;

type CalendarStringField = (typeof CALENDAR_ENCRYPTED_FIELDS)[number];
type CalendarWithEncryptedFields = Partial<Record<CalendarStringField, string | null | undefined>>;

export function encryptCalendarEvent<T extends CalendarWithEncryptedFields>(data: T): T {
  const result = { ...data } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = encryptField(
        result[field] as string | null | undefined
      );
    }
  }
  return result as T;
}

export function decryptCalendarEvent<T extends CalendarWithEncryptedFields>(record: T): T {
  const result = { ...record } as T & CalendarWithEncryptedFields;
  for (const field of CALENDAR_ENCRYPTED_FIELDS) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = decryptField(
        result[field] as string | null | undefined
      );
    }
  }
  return result as T;
}

// ─────────────────────────────────────────────
// AiConversation
// ─────────────────────────────────────────────

type AiConversationWithEncryptedFields = {
  title?: string | null;
  messages?: Prisma.JsonValue | null | unknown;
  context?: Prisma.JsonValue | null | unknown;
};

export function encryptAiConversation<T extends AiConversationWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("title" in result && result.title != null) {
    result.title = encryptField(result.title as string) as string | null | undefined;
  }
  if ("messages" in result && result.messages != null) {
    result.messages = encryptJson(result.messages as Prisma.JsonValue);
  }
  if ("context" in result && result.context != null) {
    result.context = encryptJson(result.context as Prisma.JsonValue);
  }
  return result as T;
}

export function decryptAiConversation<T extends AiConversationWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("title" in result && result.title != null) {
    result.title = decryptField(result.title as string) as string | null | undefined;
  }
  if ("messages" in result && result.messages != null) {
    result.messages = decryptJson(result.messages as Prisma.JsonValue);
  }
  if ("context" in result && result.context != null) {
    result.context = decryptJson(result.context as Prisma.JsonValue);
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────

type DocumentWithEncryptedFields = {
  document_name?: string | null;
  description?: string | null;
};

export function encryptDocument<T extends DocumentWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("document_name" in result) {
    result.document_name = encryptField(result.document_name) as string | null | undefined;
  }
  if ("description" in result) {
    result.description = encryptField(result.description) as string | null | undefined;
  }
  return result as T;
}

export function decryptDocument<T extends DocumentWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("document_name" in result) {
    result.document_name = decryptField(result.document_name) as string | null | undefined;
  }
  if ("description" in result) {
    result.description = decryptField(result.description) as string | null | undefined;
  }
  return result as T;
}

// ─────────────────────────────────────────────
// Properties (limited — owner-sensitive fields only)
// ─────────────────────────────────────────────

type PropertyWithEncryptedFields = {
  primary_email?: string | null;
  communication_notes?: Prisma.JsonValue | null;
};

export function encryptProperty<T extends PropertyWithEncryptedFields>(data: T): T {
  const result = { ...data };
  if ("primary_email" in result) {
    result.primary_email = encryptField(result.primary_email) as string | null | undefined;
  }
  if ("communication_notes" in result) {
    result.communication_notes = encryptJson(result.communication_notes);
  }
  return result as T;
}

export function decryptProperty<T extends PropertyWithEncryptedFields>(record: T): T {
  const result = { ...record };
  if ("primary_email" in result) {
    result.primary_email = decryptField(result.primary_email) as string | null | undefined;
  }
  if ("communication_notes" in result) {
    result.communication_notes = decryptJson(result.communication_notes);
  }
  return result as T;
}
```

**Step 2: Verify TypeScript compiles with no errors**

```bash
pnpm tsc --noEmit --project tsconfig.json 2>&1 | grep "model-encryption" | head -20
```

Expected: No errors referencing `lib/model-encryption.ts`.

**Step 3: Commit**

```bash
git add lib/model-encryption.ts
git commit -m "feat(encryption): add typed model-level encryption helpers"
```

---

## Task 2: Update Client Read Actions

**Files:**
- Modify: `actions/crm/get-client.ts`
- Modify: `actions/crm/get-clients.ts`

**Context:** `getClient` returns a single client with all fields. `getClients` returns a list with selected fields (`client_name`, `primary_email`). Both must decrypt after the DB fetch.

**Step 1: Update `get-client.ts`**

Add the import at the top:
```typescript
import { decryptClient } from "@/lib/model-encryption";
```

After `if (!data) { return null; }` and before `const mappedData = {...}`, add:
```typescript
const decryptedData = decryptClient(data);
```

Then change the `mappedData` spread from `...data` to `...decryptedData`:
```typescript
const mappedData = {
  ...decryptedData,
  assigned_to_user: decryptedData.Users_Clients_assigned_toToUsers,
  contacts: decryptedData.Client_Contacts,
};
```

**Step 2: Update `get-clients.ts`**

Add the import at the top:
```typescript
import { decryptClient } from "@/lib/model-encryption";
```

In the `.map((c) => ({...}))` block, decrypt each record before mapping:
```typescript
return data.map((c) => {
  const dec = decryptClient(c);
  return {
    ...dec,
    name: dec.client_name,
    email: dec.primary_email,
    status: dec.client_status === "ACTIVE" ? "Active" : "IN_PROGRESS",
    assigned_to_user: dec.Users_Clients_assigned_toToUsers,
    contacts: (dec.Client_Contacts || []).map((p) => ({
      ...p,
      first_name: p.contact_first_name,
      last_name: p.contact_last_name,
    })),
  };
});
```

**Step 3: Verify no TypeScript errors**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(get-client|get-clients)" | head -10
```

Expected: No errors.

**Step 4: Commit**

```bash
git add actions/crm/get-client.ts actions/crm/get-clients.ts
git commit -m "feat(encryption): decrypt client PII fields on read"
```

---

## Task 3: Update Client Write Actions

**Files:**
- Modify: `actions/crm/update-client.ts`

**Context:** `updateClient` takes `data: any` and spreads it directly into Prisma's `update`. We must encrypt before passing to Prisma.

**Step 1: Update `update-client.ts`**

Add import:
```typescript
import { encryptClient } from "@/lib/model-encryption";
```

Before the `prismadb.clients.update(...)` call, encrypt the incoming data:
```typescript
const encryptedData = encryptClient(data);

const updatedClient = await prismadb.clients.update({
  where: {
    id: clientId,
    organizationId,
  },
  data: {
    ...encryptedData,
    updatedBy: user.id,
  },
});
```

**Step 2: Also check `actions/crm/get-shared-client.ts` and `get-shared-clients.ts`**

Open each file, find the DB `findFirst`/`findMany` call, and add `decryptClient()` to the result before returning. Pattern:

```typescript
import { decryptClient } from "@/lib/model-encryption";
// ...after DB fetch:
if (!data) return null;
return decryptClient(data);
```

**Step 3: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(update-client|shared-client)" | head -10
```

**Step 4: Commit**

```bash
git add actions/crm/update-client.ts actions/crm/get-shared-client.ts actions/crm/get-shared-clients.ts
git commit -m "feat(encryption): encrypt client PII fields on write, decrypt shared views"
```

---

## Task 4: Update Messaging Actions

**Files:**
- Modify: `actions/messaging/messages.ts`

**Context:** Three functions touch `content`: `sendMessage` (create), `getMessages` (read list), `editMessage` (update). All three need the encrypt/decrypt helper.

**Step 1: Add import**

```typescript
import { encryptMessage, decryptMessage } from "@/lib/model-encryption";
```

**Step 2: Update `sendMessage` — encrypt on create**

Find this line (around line 100):
```typescript
content: params.content,
```

Replace with:
```typescript
content: encryptMessage({ content: params.content }).content,
```

The returned `message.content` back to the caller should also be the encrypted form (that's fine — the caller should call `decryptMessage` on it if displaying). Actually, for the return object `{ id, content, senderId, createdAt }`, we should return the plain-text content for immediate display:

```typescript
return {
  success: true,
  message: {
    id: message.id,
    content: params.content,  // return original plaintext, not encrypted
    senderId: message.senderId,
    createdAt: message.createdAt,
  },
};
```

**Step 3: Update `getMessages` — decrypt in map**

Find the `formattedMessages` map (around line 259). In the return object for each message, decrypt `content`:

```typescript
const formattedMessages = resultMessages.map(msg => {
  const decrypted = decryptMessage(msg);
  // ... rest of the reaction grouping logic using `decrypted` instead of `msg`
  return {
    id: decrypted.id,
    content: decrypted.content,
    contentType: decrypted.contentType,
    senderId: decrypted.senderId,
    parentId: decrypted.parentId,
    threadCount: decrypted.threadCount,
    isEdited: decrypted.isEdited,
    createdAt: decrypted.createdAt,
    editedAt: decrypted.editedAt,
    reactions: /* same grouping logic, but use msg.reactions */,
    attachments: decrypted.attachments,
  };
});
```

Note: Keep `msg.reactions` for the reaction grouping since reactions don't have encrypted fields.

**Step 4: Update `editMessage` — encrypt new content**

Find this update call (around line 330):
```typescript
data: {
  content,
  isEdited: true,
  editedAt: new Date(),
},
```

Replace with:
```typescript
data: {
  content: encryptMessage({ content }).content,
  isEdited: true,
  editedAt: new Date(),
},
```

**Step 5: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep "messages.ts" | head -10
```

**Step 6: Commit**

```bash
git add actions/messaging/messages.ts
git commit -m "feat(encryption): encrypt/decrypt message content"
```

---

## Task 5: Update AI Conversation Actions

**Files:**
- Modify: `actions/ai/create-conversation.ts`
- Modify: `actions/ai/update-conversation.ts`
- Modify: `actions/ai/get-conversations.ts`

**Context:** `AiConversation` stores `messages` and `context` as `Json?` fields. When encrypted they become string values stored in the JSON column. `title` is a plain `String?`.

**Step 1: Update `create-conversation.ts`**

Add import:
```typescript
import { encryptAiConversation } from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";
```

Wrap the create data:
```typescript
const encryptedInput = encryptAiConversation({
  title: input.title || null,
  messages: input.messages,
  context: input.context ?? null,
});

const conversation = await prismadb.aiConversation.create({
  data: {
    organizationId,
    userId: user.id,
    title: encryptedInput.title,
    messages: encryptedInput.messages as Prisma.InputJsonValue,
    context: encryptedInput.context != null
      ? (encryptedInput.context as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  },
});
```

In the return value, return the original plaintext `input.title` and `input.messages` (not the encrypted forms) so the caller has usable data:
```typescript
return {
  id: conversation.id,
  title: input.title || null,
  messages: input.messages,
  createdAt: conversation.createdAt.toISOString(),
  updatedAt: conversation.updatedAt.toISOString(),
};
```

**Step 2: Update `update-conversation.ts`**

Add import:
```typescript
import { encryptAiConversation, decryptAiConversation } from "@/lib/model-encryption";
import type { Prisma } from "@prisma/client";
```

Encrypt before the update:
```typescript
const toEncrypt: { title?: string; messages?: unknown } = {};
if (input.title !== undefined) toEncrypt.title = input.title;
if (input.messages !== undefined) toEncrypt.messages = input.messages;
const encrypted = encryptAiConversation(toEncrypt);

const conversation = await prismadb.aiConversation.update({
  where: { id: input.id },
  data: {
    ...(input.title !== undefined && { title: encrypted.title }),
    ...(input.messages !== undefined && {
      messages: encrypted.messages as unknown as Prisma.InputJsonValue,
    }),
  },
});
```

Return plaintext data back to caller:
```typescript
return {
  id: conversation.id,
  title: input.title ?? conversation.title,
  messages: input.messages ?? conversation.messages,
  createdAt: conversation.createdAt.toISOString(),
  updatedAt: conversation.updatedAt.toISOString(),
};
```

**Step 3: Update `get-conversations.ts`**

Add import:
```typescript
import { decryptAiConversation } from "@/lib/model-encryption";
```

In the `.map((c) => ({...}))`:
```typescript
return conversations.map((c) => {
  const dec = decryptAiConversation(c);
  return {
    ...dec,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
});
```

**Step 4: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(create-conversation|update-conversation|get-conversations)" | head -10
```

**Step 5: Commit**

```bash
git add actions/ai/create-conversation.ts actions/ai/update-conversation.ts actions/ai/get-conversations.ts
git commit -m "feat(encryption): encrypt/decrypt AI conversation title and messages"
```

---

## Task 6: Update Calendar Actions

**Files:**
- Modify: `actions/calendar/invite-to-event.ts`
- Search for other calendar write actions

**Context:** `invite-to-event.ts` reads `event.title` to generate a notification message. If the title is encrypted, the notification text will contain gibberish — must decrypt after reading. CalendarEvents may also be created via the AI tools calendar actions.

**Step 1: Update `invite-to-event.ts`**

Add import:
```typescript
import { decryptCalendarEvent } from "@/lib/model-encryption";
```

After fetching the event:
```typescript
if (!event) {
  return { success: false, error: "Event not found" };
}
const decryptedEvent = decryptCalendarEvent(event);
```

Replace `event.title` with `decryptedEvent.title` in the notification message (around line 76):
```typescript
message: `${currentUser.name || currentUser.email} invited you to "${decryptedEvent.title || "an event"}"`,
// ...
metadata: {
  eventTitle: decryptedEvent.title,
  eventStartTime: event.startTime.toISOString(),
},
```

**Step 2: Search for other calendar event write paths**

```bash
grep -r "calendarEvent.create\|calendarEvent.update" --include="*.ts" .
```

For each result found: add `encryptCalendarEvent(data)` before the create/update call. Common paths may include `actions/ai/tools/calendar.ts`.

Check `actions/ai/tools/calendar.ts`:
```bash
head -80 actions/ai/tools/calendar.ts
```

If it calls `prismadb.calendarEvent.create({ data: { title, description, ... } })`, wrap the data object with `encryptCalendarEvent(...)`.

**Step 3: Search for calendar event read paths**

```bash
grep -r "calendarEvent.find\|CalendarEvent.find" --include="*.ts" . | grep -v "node_modules\|.next"
```

For each read path that returns title/description/location/attendee fields to the caller, add `decryptCalendarEvent(result)`.

**Step 4: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep "calendar" | head -10
```

**Step 5: Commit**

```bash
git add actions/calendar/invite-to-event.ts actions/ai/tools/calendar.ts
git commit -m "feat(encryption): encrypt/decrypt calendar event sensitive fields"
```

---

## Task 7: Update Document Actions

**Files:**
- Modify: `actions/documents/create-document.ts`
- Modify: `actions/documents/get-document.ts`
- Modify: `actions/documents/get-documents.ts`

**Context:** Documents have `document_name` and `description`. The `document_name` is the visible display name shown throughout the UI. The `document_file_url`, `status`, `visibility` are left plain-text.

**Step 1: Update `create-document.ts`**

Add import:
```typescript
import { encryptDocument } from "@/lib/model-encryption";
```

Find where the document is created (inside `withTenantContext`). Before passing `document_name` and `description` to the Prisma create call, encrypt them:

```typescript
const encryptedName = encryptDocument({ document_name: input.document_name }).document_name;
const encryptedDesc = input.description
  ? encryptDocument({ description: input.description }).description
  : undefined;
```

Use `encryptedName` and `encryptedDesc` in the Prisma create data instead of `input.document_name` and `input.description`.

**Step 2: Update `get-document.ts` — `getDocument` function**

Add import:
```typescript
import { decryptDocument, decryptClient, decryptCalendarEvent } from "@/lib/model-encryption";
```

After `if (!document) return null;`, decrypt the document and its related client names:

```typescript
const decryptedDocument = decryptDocument(document);

// Decrypt linked client names
const decryptedClients = decryptedDocument.Clients.map(c => decryptClient(c));
const decryptedEvents = decryptedDocument.CalendarEvent.map(e => decryptCalendarEvent(e));

return {
  ...decryptedDocument,
  accounts: decryptedClients,
  linkedProperties: decryptedDocument.Properties,
  linkedCalendarEvents: decryptedEvents,
  // ... rest of mappings
};
```

**Step 3: Update `get-documents.ts`**

Add import:
```typescript
import { decryptDocument } from "@/lib/model-encryption";
```

The `getDocuments` function returns a list. Find the `return` statement at the end and wrap each document:

```bash
grep -n "return" actions/documents/get-documents.ts | tail -5
```

Add a `.map(doc => decryptDocument(doc))` to the returned array.

**Step 4: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(create-document|get-document)" | head -10
```

**Step 5: Commit**

```bash
git add actions/documents/create-document.ts actions/documents/get-document.ts actions/documents/get-documents.ts
git commit -m "feat(encryption): encrypt/decrypt document name and description"
```

---

## Task 8: Update Property Actions (Limited)

**Files:**
- Modify: `actions/mls/get-property.ts`
- Modify: `actions/mls/get-properties.ts`
- Modify: `actions/mls/get-shared-property.ts`

**Context:** Only `primary_email` and `communication_notes` are encrypted in Properties. Property creation is typically done through a property form action — search for `properties.create` to find the write path.

**Step 1: Find the property write action**

```bash
grep -r "properties.create\|Properties.create" --include="*.ts" . | grep -v "node_modules\|.next"
```

For the create action, add:
```typescript
import { encryptProperty } from "@/lib/model-encryption";
// Before create:
const encryptedData = encryptProperty({ primary_email: data.primary_email, communication_notes: data.communication_notes });
```

**Step 2: Update property read actions**

In `get-property.ts`, `get-properties.ts`, and `get-shared-property.ts`:
```typescript
import { decryptProperty } from "@/lib/model-encryption";
// After DB fetch:
return decryptProperty(record);
// Or for a list:
return records.map(r => decryptProperty(r));
```

**Step 3: Verify**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(get-property|get-properties)" | head -10
```

**Step 4: Commit**

```bash
git add actions/mls/get-property.ts actions/mls/get-properties.ts actions/mls/get-shared-property.ts
git commit -m "feat(encryption): encrypt/decrypt property owner email and notes"
```

---

## Task 9: Write Migration Script

**Files:**
- Create: `scripts/encrypt-existing-data.ts`

**Context:** All existing data is plain-text. This script paginates through each table and encrypts unencrypted fields. It is idempotent — re-running is safe because `encryptClient` checks `isEncrypted` before encrypting.

**Step 1: Create the script**

```typescript
#!/usr/bin/env tsx
/**
 * scripts/encrypt-existing-data.ts
 *
 * One-time migration to encrypt existing plain-text sensitive fields.
 *
 * Usage:
 *   pnpm tsx scripts/encrypt-existing-data.ts          # Run migration
 *   pnpm tsx scripts/encrypt-existing-data.ts --dry-run # Preview only
 *
 * Safety:
 * - Idempotent: skips already-encrypted values
 * - Batched: 100 records at a time, cursor-based pagination
 * - Dry-run: preview without writing
 * - Logs to stdout + migration-YYYY-MM-DD.log
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { createWriteStream } from "fs";
import {
  encryptClient,
  encryptMessage,
  encryptCalendarEvent,
  encryptAiConversation,
  encryptDocument,
  encryptProperty,
} from "../lib/model-encryption";

const isDryRun = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;
const prisma = new PrismaClient();

// ── Logging ──────────────────────────────────────────────────────────────

const logFile = createWriteStream(
  `migration-${new Date().toISOString().slice(0, 10)}.log`,
  { flags: "a" }
);

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logFile.write(line + "\n");
}

// ── Safety check ──────────────────────────────────────────────────────────

function assertEncryptionKey() {
  const key = process.env.SECRETS_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    log("ERROR: SECRETS_ENCRYPTION_KEY not set or invalid. Aborting.");
    process.exit(1);
  }
  log(`Encryption key present (${isDryRun ? "DRY RUN" : "LIVE"} mode)`);
}

// ── Generic paginator ──────────────────────────────────────────────────────

async function paginate<T extends { id: string }>(
  tableName: string,
  fetcher: (cursor?: string) => Promise<T[]>,
  processor: (records: T[]) => Promise<{ updated: number; skipped: number }>
) {
  let cursor: string | undefined;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let page = 0;

  while (true) {
    const records = await fetcher(cursor);
    if (records.length === 0) break;
    page++;

    try {
      const { updated, skipped } = await processor(records);
      totalUpdated += updated;
      totalSkipped += skipped;
      log(`  ${tableName} page ${page}: ${updated} encrypted, ${skipped} skipped`);
    } catch (err) {
      log(`  ${tableName} page ${page} ERROR: ${err}`);
    }

    cursor = records[records.length - 1].id;
  }

  log(`  ${tableName} TOTAL: ${totalUpdated} encrypted, ${totalSkipped} skipped`);
}

// ── Table migrations ──────────────────────────────────────────────────────

async function migrateClients() {
  log("Migrating Clients...");
  const CLIENT_FIELDS = [
    "client_name", "primary_email", "secondary_email",
    "primary_phone", "secondary_phone", "afm", "vat", "id_doc",
    "description", "billing_street", "billing_city", "billing_state",
    "billing_postal_code", "billing_country", "shipping_street",
    "shipping_city", "shipping_state", "shipping_postal_code",
    "shipping_country",
  ] as const;

  await paginate(
    "Clients",
    (cursor) =>
      prisma.clients.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: {
          id: true,
          ...Object.fromEntries(CLIENT_FIELDS.map((f) => [f, true])),
          communication_notes: true,
        },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptClient(record);

        // Check if anything changed
        const changed = CLIENT_FIELDS.some(
          (f) => encrypted[f] !== record[f]
        ) || encrypted.communication_notes !== record.communication_notes;

        if (!changed) {
          skipped++;
          continue;
        }

        if (!isDryRun) {
          await prisma.clients.update({
            where: { id: record.id },
            data: Object.fromEntries(
              [
                ...CLIENT_FIELDS.map((f) => [f, encrypted[f]]),
                ["communication_notes", encrypted.communication_notes],
              ]
            ),
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

async function migrateMessages() {
  log("Migrating Messages...");

  await paginate(
    "Message",
    (cursor) =>
      prisma.message.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { id: true, content: true },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptMessage(record);
        if (encrypted.content === record.content) {
          skipped++;
          continue;
        }
        if (!isDryRun) {
          await prisma.message.update({
            where: { id: record.id },
            data: { content: encrypted.content },
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

async function migrateCalendarEvents() {
  log("Migrating CalendarEvents...");
  const FIELDS = ["title", "description", "location", "attendeeEmail", "attendeeName", "notes"] as const;

  await paginate(
    "CalendarEvent",
    (cursor) =>
      prisma.calendarEvent.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { id: true, ...Object.fromEntries(FIELDS.map((f) => [f, true])) },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptCalendarEvent(record);
        const changed = FIELDS.some((f) => encrypted[f] !== record[f]);
        if (!changed) { skipped++; continue; }
        if (!isDryRun) {
          await prisma.calendarEvent.update({
            where: { id: record.id },
            data: Object.fromEntries(FIELDS.map((f) => [f, encrypted[f]])),
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

async function migrateAiConversations() {
  log("Migrating AiConversations...");

  await paginate(
    "AiConversation",
    (cursor) =>
      prisma.aiConversation.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { id: true, title: true, messages: true, context: true },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptAiConversation(record);
        const changed =
          encrypted.title !== record.title ||
          encrypted.messages !== record.messages ||
          encrypted.context !== record.context;
        if (!changed) { skipped++; continue; }
        if (!isDryRun) {
          await prisma.aiConversation.update({
            where: { id: record.id },
            data: {
              title: encrypted.title,
              messages: encrypted.messages as Prisma.InputJsonValue,
              context: encrypted.context != null
                ? (encrypted.context as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            },
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

async function migrateDocuments() {
  log("Migrating Documents...");

  await paginate(
    "Documents",
    (cursor) =>
      prisma.documents.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { id: true, document_name: true, description: true },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptDocument(record);
        const changed =
          encrypted.document_name !== record.document_name ||
          encrypted.description !== record.description;
        if (!changed) { skipped++; continue; }
        if (!isDryRun) {
          await prisma.documents.update({
            where: { id: record.id },
            data: {
              document_name: encrypted.document_name!,
              description: encrypted.description,
            },
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

async function migrateProperties() {
  log("Migrating Properties (primary_email + communication_notes)...");

  await paginate(
    "Properties",
    (cursor) =>
      prisma.properties.findMany({
        take: BATCH_SIZE,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: { id: true, primary_email: true, communication_notes: true },
        orderBy: { id: "asc" },
      }),
    async (records) => {
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        const encrypted = encryptProperty(record);
        const changed =
          encrypted.primary_email !== record.primary_email ||
          encrypted.communication_notes !== record.communication_notes;
        if (!changed) { skipped++; continue; }
        if (!isDryRun) {
          await prisma.properties.update({
            where: { id: record.id },
            data: {
              primary_email: encrypted.primary_email,
              communication_notes: encrypted.communication_notes as Prisma.InputJsonValue,
            },
          });
        }
        updated++;
      }

      return { updated, skipped };
    }
  );
}

// ── Entry point ──────────────────────────────────────────────────────────

async function main() {
  log(`=== Field-Level Encryption Migration ${isDryRun ? "(DRY RUN)" : "(LIVE)"} ===`);
  assertEncryptionKey();

  try {
    await migrateClients();
    await migrateProperties();
    await migrateCalendarEvents();
    await migrateMessages();
    await migrateAiConversations();
    await migrateDocuments();
    log("=== Migration complete ===");
  } finally {
    await prisma.$disconnect();
    logFile.end();
  }
}

main().catch((err) => {
  log(`FATAL: ${err}`);
  process.exit(1);
});
```

**Step 2: Verify the script compiles**

```bash
pnpm tsc --noEmit scripts/encrypt-existing-data.ts 2>&1 | head -20
```

Expected: No errors.

**Step 3: Run a dry-run**

```bash
pnpm tsx scripts/encrypt-existing-data.ts --dry-run
```

Expected output:
```
[2026-03-01T...] === Field-Level Encryption Migration (DRY RUN) ===
[2026-03-01T...] Encryption key present (DRY RUN mode)
[2026-03-01T...] Migrating Clients...
[2026-03-01T...]   Clients page 1: N encrypted, M skipped
...
[2026-03-01T...] === Migration complete ===
```

Verify the counts look plausible (should be close to total record count for each table).

**Step 4: Run the live migration**

```bash
pnpm tsx scripts/encrypt-existing-data.ts
```

Watch for any ERROR lines in the output. If errors appear for specific pages, note the table and investigate before re-running.

**Step 5: Verify idempotency**

```bash
pnpm tsx scripts/encrypt-existing-data.ts --dry-run
```

Expected: All rows show as "skipped" (already encrypted).

**Step 6: Commit**

```bash
git add scripts/encrypt-existing-data.ts
git commit -m "feat(encryption): add one-time migration script for existing data"
```

---

## Task 10: Update `.env.example` and Final Verification

**Files:**
- Modify: `.env.example`

**Step 1: Add the encryption key to `.env.example`**

Find the section for secrets/environment variables in `.env.example` and add:

```bash
# Field-level encryption key (AES-256-GCM, 32 bytes = 64 hex chars)
# Generate with: openssl rand -hex 32
# CRITICAL: Back this up securely. Data encrypted with this key cannot be
# recovered without it.
SECRETS_ENCRYPTION_KEY=
```

**Step 2: Verify the key is already in `.gitignore`**

```bash
grep -n "SECRETS_ENCRYPTION_KEY\|\.env" .gitignore | head -10
```

`.env` should already be gitignored. If not, add it.

**Step 3: Run TypeScript check across all changed files**

```bash
pnpm tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: 0 errors related to any of the files we modified.

**Step 4: Run lint**

```bash
pnpm lint 2>&1 | grep -E "(model-encryption|encrypt)" | head -20
```

Fix any lint issues found.

**Step 5: Final commit**

```bash
git add .env.example
git commit -m "docs: document SECRETS_ENCRYPTION_KEY in .env.example"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `SECRETS_ENCRYPTION_KEY` is set in `.env` (dev) and production secrets
- [ ] `lib/model-encryption.ts` created with all 6 model helpers
- [ ] TypeScript compiles with `pnpm tsc --noEmit`
- [ ] Client: read actions decrypt, write actions encrypt
- [ ] Messages: send encrypts, get decrypts, edit encrypts
- [ ] AI conversations: create and update encrypt, get decrypts
- [ ] Calendar events: title/description/location/attendee/notes encrypted
- [ ] Documents: document_name and description encrypted
- [ ] Properties: primary_email and communication_notes encrypted
- [ ] Migration script runs in dry-run mode without errors
- [ ] Migration script runs in live mode without errors
- [ ] Re-running migration in dry-run mode shows 100% "skipped"
- [ ] Spot-check: open a client in the app and verify the name/email display correctly
- [ ] Spot-check: open Prisma Studio and verify client fields show ciphertext, not names/emails

---

## Notes for Future Development

- **New fields that need encryption**: Import the relevant helper from `lib/model-encryption.ts` and add the field to the constant array. The migration script's idempotency check handles new fields automatically on re-run.
- **Key rotation**: Update `SECRETS_ENCRYPTION_KEY` and run a modified migration that decrypts with the old key and re-encrypts with the new one.
- **Client_Contacts model**: Contact first/last names are not currently in scope. If needed in future, add `encryptContact`/`decryptContact` helpers following the same pattern.
- **The E2EE system** (`EncryptionProvider`, `OrganizationEncryptionKey`) can be completed in a future phase for highest-sensitivity fields, built on top of this server-side layer.
