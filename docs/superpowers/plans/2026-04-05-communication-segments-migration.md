# Communication System: Audiences → Segments Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the platform admin Communication system from the deprecated Resend Audiences API to the new Segments API, fix the broken audiences page, rename UI from "Audiences" to "Segments", and support multi-segment selection per campaign.

**Architecture:** The Resend SDK v6.9.4 has deprecated `resend.audiences` (aliased to `Segments` class). We migrate all API calls to use `resend.segments.list()`, `resend.contacts.list({ segmentId })`, and `resend.contacts.segments.*`. The Prisma `audienceId String?` field becomes `segmentIds String[]` to support multi-segment targeting. The `/audiences` route becomes `/segments`.

**Tech Stack:** Next.js 16, Resend SDK v6.9.4, Prisma ORM, Upstash Redis, shadcn/ui, next-intl

---

## File Structure

### Files to Create
- `actions/platform-admin/communication/get-segments.ts` — replaces `get-audiences.ts`
- `actions/platform-admin/communication/get-segment-contacts.ts` — replaces `get-audience-contacts.ts`
- `app/[locale]/app/(platform_admin)/platform-admin/communication/segments/page.tsx` — replaces audiences page
- `app/[locale]/app/(platform_admin)/platform-admin/communication/segments/components/SegmentsClient.tsx` — replaces AudiencesClient

### Files to Modify
- `prisma/schema.prisma` — `audienceId String?` → `segmentIds String[]`
- `lib/communication/types.ts` — `CommunicationAudience` → `CommunicationSegment`, `audienceId` → `segmentIds`
- `lib/resend-segments.ts` — remove legacy `audienceId` references in `addContactToSegment()`
- `actions/platform-admin/communication/update-campaign.ts` — `audienceId` → `segmentIds`
- `actions/platform-admin/communication/send-campaign.ts` — fetch contacts from multiple segments, deduplicate
- `actions/platform-admin/communication/add-contact.ts` — `audienceId` param → `segmentId`, update Resend API calls
- `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/page.tsx` — load segments instead of audiences
- `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/components/CampaignEditor.tsx` — multi-segment state
- `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/components/CampaignSettingsPanel.tsx` — multi-select UI for segments
- `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/components/CampaignsClient.tsx` — display segment names
- `app/[locale]/app/(platform_admin)/platform-admin/communication/page.tsx` — redirect to `/segments`
- `app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx` — update nav link
- `locales/en/platformAdmin.json` — `nav.audiences` → `nav.segments`
- `locales/el/platformAdmin.json` — `nav.audiences` → `nav.segments` (Greek: "Τμήματα")
- `app/api/newsletter/route.ts` — fix `audienceId` parameter name in `contacts.create()`
- `app/api/newsletter/unsubscribe/route.ts` — rename `audienceIds` → `segmentIds` variables

### Files to Delete (after new files are in place)
- `actions/platform-admin/communication/get-audiences.ts`
- `actions/platform-admin/communication/get-audience-contacts.ts`
- `app/[locale]/app/(platform_admin)/platform-admin/communication/audiences/` (entire directory)

---

## Task 1: Database Migration — `audienceId` → `segmentIds`

**Files:**
- Modify: `prisma/schema.prisma:1878`

The schema field changes from a single optional string to an array of strings, supporting multi-segment targeting.

- [ ] **Step 1: Update Prisma schema**

In `prisma/schema.prisma`, find the `NewsletterCampaign` model and change:

```prisma
// OLD (line 1878):
  audienceId       String? // Resend audience ID used when sent

// NEW:
  segmentIds       String[] // Resend segment IDs for targeting
```

- [ ] **Step 2: Generate and apply migration**

```bash
pnpm prisma migrate dev --name rename_audience_to_segments
```

Expected: Migration created successfully. The migration SQL will:
1. Add `segmentIds TEXT[]` column with default `{}`
2. Copy any existing `audienceId` values into `segmentIds` as single-element arrays
3. Drop `audienceId` column

**Important:** If the auto-generated migration doesn't copy data, manually edit the migration SQL to include:

```sql
-- Copy existing audienceId values into segmentIds array
UPDATE "NewsletterCampaign" SET "segmentIds" = ARRAY["audienceId"] WHERE "audienceId" IS NOT NULL;
```

before the `ALTER TABLE "NewsletterCampaign" DROP COLUMN "audienceId"` statement.

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected: Prisma client regenerated with `segmentIds: string[]` on the `NewsletterCampaign` model.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(communication): migrate audienceId to segmentIds array in NewsletterCampaign"
```

---

## Task 2: Update Type Definitions

**Files:**
- Modify: `lib/communication/types.ts`

- [ ] **Step 1: Rename `CommunicationAudience` → `CommunicationSegment`**

In `lib/communication/types.ts`, replace lines 15-20:

```typescript
// OLD:
// Audience type (from Resend API)
export interface CommunicationAudience {
  id: string;
  name: string;
  createdAt: string;
}

// NEW:
// Segment type (from Resend API)
export interface CommunicationSegment {
  id: string;
  name: string;
  createdAt: string;
}
```

- [ ] **Step 2: Update `SerializedCampaign` interface**

In the same file, change line 84:

```typescript
// OLD:
  audienceId: string | null

// NEW:
  segmentIds: string[]
```

- [ ] **Step 3: Update `serializeCampaign` function parameter type**

Change line 113:

```typescript
// OLD:
  audienceId: string | null

// NEW:
  segmentIds: string[]
```

- [ ] **Step 4: Commit**

```bash
git add lib/communication/types.ts
git commit -m "refactor(communication): rename CommunicationAudience to CommunicationSegment, audienceId to segmentIds"
```

---

## Task 3: New Server Actions — `get-segments.ts` and `get-segment-contacts.ts`

**Files:**
- Create: `actions/platform-admin/communication/get-segments.ts`
- Create: `actions/platform-admin/communication/get-segment-contacts.ts`

- [ ] **Step 1: Create `get-segments.ts`**

```typescript
"use server"

import resendHelper from "@/lib/resend"
import { cacheGet, cacheSet } from "@/lib/redis"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import type { CommunicationSegment } from "@/lib/communication/types"

const CACHE_KEY = "comm:segments"
const CACHE_TTL = 300 // 5 minutes

export async function getSegments(): Promise<CommunicationSegment[]> {
  await requirePlatformAdmin()

  try {
    const cached = await cacheGet<CommunicationSegment[]>(CACHE_KEY)
    if (cached) return cached

    const resend = await resendHelper()
    const { data, error } = await resend.segments.list()

    if (error || !data) {
      console.error("[GET_SEGMENTS] Resend error:", error)
      return []
    }

    const segments: CommunicationSegment[] = data.data.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.created_at,
    }))

    await cacheSet(CACHE_KEY, segments, CACHE_TTL)
    return segments
  } catch (error) {
    console.error("[GET_SEGMENTS]", error)
    return []
  }
}
```

- [ ] **Step 2: Create `get-segment-contacts.ts`**

```typescript
"use server"

import resendHelper from "@/lib/resend"
import { cacheGet, cacheSet } from "@/lib/redis"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import type { CommunicationContact } from "@/lib/communication/types"

const CACHE_TTL = 120 // 2 minutes
const PAGE_SIZE = 500

interface GetSegmentContactsResult {
  contacts: CommunicationContact[]
  total: number
}

export async function getSegmentContacts(
  segmentId: string,
  page: number = 1
): Promise<GetSegmentContactsResult> {
  await requirePlatformAdmin()

  const cacheKey = `comm:segment:${segmentId}:contacts`

  try {
    const cachedAll = await cacheGet<CommunicationContact[]>(cacheKey)
    if (cachedAll) {
      const offset = (page - 1) * PAGE_SIZE
      return { contacts: cachedAll.slice(offset, offset + PAGE_SIZE), total: cachedAll.length }
    }

    const resend = await resendHelper()
    const { data, error } = await resend.contacts.list({ segmentId })

    if (error || !data) {
      console.error("[GET_SEGMENT_CONTACTS] Resend error:", error)
      return { contacts: [], total: 0 }
    }

    const allContacts: CommunicationContact[] = data.data.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.first_name ?? null,
      lastName: c.last_name ?? null,
      unsubscribed: c.unsubscribed,
      createdAt: c.created_at,
    }))

    await cacheSet(cacheKey, allContacts, CACHE_TTL)
    const offset = (page - 1) * PAGE_SIZE
    return { contacts: allContacts.slice(offset, offset + PAGE_SIZE), total: allContacts.length }
  } catch (error) {
    console.error("[GET_SEGMENT_CONTACTS]", error)
    return { contacts: [], total: 0 }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add actions/platform-admin/communication/get-segments.ts actions/platform-admin/communication/get-segment-contacts.ts
git commit -m "feat(communication): add get-segments and get-segment-contacts server actions using new Resend API"
```

---

## Task 4: Update `add-contact.ts` Action

**Files:**
- Modify: `actions/platform-admin/communication/add-contact.ts`

- [ ] **Step 1: Update parameter name and Resend API calls**

Replace the entire file content with:

```typescript
"use server"

import resendHelper from "@/lib/resend"
import { cacheDel } from "@/lib/redis"
import { requirePlatformAdmin } from "@/lib/platform-admin"

interface AddContactResult {
  success: boolean
  error?: string
}

export async function addContact(
  segmentId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<AddContactResult> {
  await requirePlatformAdmin()

  try {
    const resend = await resendHelper()

    // Create the contact globally first
    const { data: contactData, error } = await resend.contacts.create({
      email,
      firstName,
      lastName,
      unsubscribed: false,
    })

    if (error) {
      const message = error.message?.toLowerCase() ?? ""
      if (message.includes("already exists") || message.includes("already_exists")) {
        // Contact already exists — that's fine, we'll add them to the segment below
      } else {
        console.error("[ADD_CONTACT] Create error:", error)
        return { success: false, error: error.message ?? "Failed to create contact" }
      }
    }

    // Add contact to the segment
    const contactIdentifier = contactData?.id
      ? { contactId: contactData.id }
      : { email }

    await resend.contacts.segments.add({
      ...contactIdentifier,
      segmentId,
    })

    // Invalidate relevant caches
    await cacheDel("comm:segments", `comm:segment:${segmentId}:contacts`)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[ADD_CONTACT]", error)
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/platform-admin/communication/add-contact.ts
git commit -m "refactor(communication): update add-contact to use Resend segments API"
```

---

## Task 5: Update `update-campaign.ts` Action

**Files:**
- Modify: `actions/platform-admin/communication/update-campaign.ts`

- [ ] **Step 1: Replace `audienceId` with `segmentIds`**

In `update-campaign.ts`, change the `UpdateCampaignData` interface (line 16):

```typescript
// OLD:
  audienceId?: string

// NEW:
  segmentIds?: string[]
```

And update the Prisma update call (line 52):

```typescript
// OLD:
      ...(data.audienceId !== undefined && { audienceId: data.audienceId }),

// NEW:
      ...(data.segmentIds !== undefined && { segmentIds: data.segmentIds }),
```

- [ ] **Step 2: Commit**

```bash
git add actions/platform-admin/communication/update-campaign.ts
git commit -m "refactor(communication): update-campaign uses segmentIds array"
```

---

## Task 6: Update `send-campaign.ts` — Multi-Segment Contact Fetching

**Files:**
- Modify: `actions/platform-admin/communication/send-campaign.ts`

This is the most critical change. The campaign now targets multiple segments, so we must fetch contacts from each segment and deduplicate by email before sending.

- [ ] **Step 1: Update segment validation and contact fetching**

Replace `send-campaign.ts` with:

```typescript
"use server"

import { prismadb } from "@/lib/prisma"
import resendHelper from "@/lib/resend"
import { EMAIL_CONFIG } from "@/lib/resend-segments"
import { requirePlatformAdmin } from "@/lib/platform-admin"
import { renderCampaignBlocks } from "./render-campaign-blocks"
import type { EmailBlock } from "@/lib/communication/types"

interface SendCampaignResult {
  success: boolean
  sentCount?: number
  error?: string
}

function personalizeHtml(
  html: string,
  vars: { firstName: string; lastName: string; email: string; name: string }
): string {
  return html
    .replace(/\{\{firstName\}\}/g, vars.firstName)
    .replace(/\{\{lastName\}\}/g, vars.lastName)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{name\}\}/g, vars.name)
}

export async function sendCampaign(campaignId: string): Promise<SendCampaignResult> {
  await requirePlatformAdmin()

  try {
    // 1. Load campaign
    const campaign = await prismadb.newsletterCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return {
        success: false,
        error: `Campaign must be DRAFT or SCHEDULED to send (current: ${campaign.status})`,
      }
    }

    if (campaign.segmentIds.length === 0) {
      return { success: false, error: "Campaign has no segments selected" }
    }

    // 2. Render HTML from blocks
    const blocks = (campaign.blocks ?? []) as EmailBlock[]
    const { html, error: renderError } = await renderCampaignBlocks(
      blocks,
      campaign.previewText ?? undefined
    )

    if (renderError || !html) {
      return { success: false, error: `Failed to render email: ${renderError}` }
    }

    // 3. Fetch contacts from all selected segments and deduplicate by email
    const resend = await resendHelper()
    const contactMap = new Map<string, { first_name: string | null; last_name: string | null; email: string }>()

    for (const segmentId of campaign.segmentIds) {
      const { data: contactsData, error: contactsError } = await resend.contacts.list({
        segmentId,
      })

      if (contactsError || !contactsData) {
        console.error(`[SEND_CAMPAIGN] Failed to fetch contacts for segment ${segmentId}:`, contactsError)
        continue
      }

      for (const c of contactsData.data) {
        if (!c.unsubscribed && !contactMap.has(c.email)) {
          contactMap.set(c.email, {
            first_name: c.first_name ?? null,
            last_name: c.last_name ?? null,
            email: c.email,
          })
        }
      }
    }

    const activeContacts = Array.from(contactMap.values())

    if (activeContacts.length === 0) {
      return { success: false, error: "No active contacts found in the selected segments" }
    }

    // 4. Set status to SENDING
    await prismadb.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENDING",
        recipientCount: activeContacts.length,
        sentAt: new Date(),
      },
    })

    // 5. Batch send — 100 per batch
    const BATCH_SIZE = 100
    const allBatchIds: string[] = []
    let totalSent = 0

    try {
      for (let i = 0; i < activeContacts.length; i += BATCH_SIZE) {
        const batch = activeContacts.slice(i, i + BATCH_SIZE)

        const emails = batch.map((contact) => {
          const firstName = contact.first_name ?? ""
          const lastName = contact.last_name ?? ""
          const name = [firstName, lastName].filter(Boolean).join(" ") || contact.email

          return {
            from: EMAIL_CONFIG.FROM,
            to: contact.email,
            subject: campaign.subject,
            html: personalizeHtml(html, {
              firstName,
              lastName,
              email: contact.email,
              name,
            }),
            headers: {
              "X-Campaign-Id": campaignId,
            },
          }
        })

        const { data: batchData, error: batchError } = await resend.batch.send(emails)

        if (batchError) {
          console.error("[SEND_CAMPAIGN] Batch error:", batchError)
          await prismadb.newsletterCampaign.update({
            where: { id: campaignId },
            data: { status: "FAILED" },
          })
          return { success: false, error: `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${batchError.message}` }
        } else if (batchData) {
          const batchIds = batchData.data.map((r: { id: string }) => r.id).filter(Boolean)
          allBatchIds.push(...batchIds)
          totalSent += emails.length
        }
      }
    } catch (batchErr) {
      console.error("[SEND_CAMPAIGN] Fatal batch error:", batchErr)
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: "FAILED" },
      })
      return { success: false, error: batchErr instanceof Error ? batchErr.message : "Batch send failed" }
    }

    // 6. Update campaign as SENT
    await prismadb.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SENT",
        sentCount: totalSent,
        completedAt: new Date(),
        resendBatchId: allBatchIds.join(",") || null,
      },
    })

    return { success: true, sentCount: totalSent }
  } catch (error) {
    console.error("[SEND_CAMPAIGN]", error)

    try {
      await prismadb.newsletterCampaign.update({
        where: { id: campaignId },
        data: { status: "FAILED" },
      })
    } catch {
      // Ignore secondary failure
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/platform-admin/communication/send-campaign.ts
git commit -m "feat(communication): send-campaign fetches contacts from multiple segments with dedup"
```

---

## Task 7: New Segments Page and Client Component

**Files:**
- Create: `app/[locale]/app/(platform_admin)/platform-admin/communication/segments/page.tsx`
- Create: `app/[locale]/app/(platform_admin)/platform-admin/communication/segments/components/SegmentsClient.tsx`

- [ ] **Step 1: Create `segments/page.tsx`**

```typescript
import { getSegments } from "@/actions/platform-admin/communication/get-segments"
import { SegmentsClient } from "./components/SegmentsClient"

export default async function SegmentsPage() {
  const segments = await getSegments()
  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <SegmentsClient segments={segments} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `segments/components/SegmentsClient.tsx`**

```typescript
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, UserPlus, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { CommunicationSegment, CommunicationContact, maskEmail } from "@/lib/communication/types"
import { getSegmentContacts } from "@/actions/platform-admin/communication/get-segment-contacts"
import { addContact } from "@/actions/platform-admin/communication/add-contact"

interface SegmentsClientProps {
  segments: CommunicationSegment[]
}

interface ContactsState {
  contacts: CommunicationContact[]
  total: number
}

export function SegmentsClient({ segments }: SegmentsClientProps) {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()

  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null)
  const [contactsMap, setContactsMap] = useState<Record<string, ContactsState>>({})
  const [loadingContactsFor, setLoadingContactsFor] = useState<string | null>(null)

  const [addContactSegmentId, setAddContactSegmentId] = useState<string | null>(null)
  const [addEmail, setAddEmail] = useState("")
  const [addFirstName, setAddFirstName] = useState("")
  const [addLastName, setAddLastName] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [isSubmitting, startSubmitTransition] = useTransition()

  const handleRefresh = () => {
    startRefreshTransition(() => {
      router.refresh()
    })
  }

  const handleToggleContacts = async (segmentId: string) => {
    if (expandedSegmentId === segmentId) {
      setExpandedSegmentId(null)
      return
    }

    setExpandedSegmentId(segmentId)

    if (contactsMap[segmentId]) return

    setLoadingContactsFor(segmentId)
    try {
      const result = await getSegmentContacts(segmentId)
      setContactsMap((prev) => ({ ...prev, [segmentId]: result }))
    } finally {
      setLoadingContactsFor(null)
    }
  }

  const handleOpenAddDialog = (segmentId: string) => {
    setAddContactSegmentId(segmentId)
    setAddEmail("")
    setAddFirstName("")
    setAddLastName("")
    setAddError(null)
    setAddSuccess(false)
  }

  const handleCloseAddDialog = () => {
    setAddContactSegmentId(null)
    setAddError(null)
    setAddSuccess(false)
  }

  const handleAddContact = () => {
    if (!addContactSegmentId) return

    const segmentId = addContactSegmentId
    setAddError(null)

    startSubmitTransition(async () => {
      const result = await addContact(
        segmentId,
        addEmail.trim(),
        addFirstName.trim() || undefined,
        addLastName.trim() || undefined
      )

      if (!result.success) {
        setAddError(result.error ?? "Failed to add contact.")
        return
      }

      setAddSuccess(true)

      setContactsMap((prev) => {
        const updated = { ...prev }
        delete updated[segmentId]
        return updated
      })

      setTimeout(() => {
        handleCloseAddDialog()
        router.refresh()
      }, 800)
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Communication</p>
          <h1 className="text-h1 flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            Segments
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty State */}
      {segments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-body font-medium mb-1">No segments found</p>
            <p className="text-caption text-muted-foreground">
              Configure your Resend API key in Settings, or create segments in your Resend dashboard.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Segment Cards */}
      {segments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment) => {
            const isExpanded = expandedSegmentId === segment.id
            const isLoadingContacts = loadingContactsFor === segment.id
            const segmentContacts = contactsMap[segment.id]

            return (
              <Card key={segment.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {segment.name}
                  </CardTitle>
                  <p className="text-caption text-muted-foreground font-mono break-all">
                    {segment.id}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Created {format(new Date(segment.createdAt), "MMM d, yyyy")}
                  </p>
                </CardHeader>

                <CardContent className="pt-0 flex flex-col gap-2 flex-1">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenAddDialog(segment.id)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                      Add Contact
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleContacts(segment.id)}
                      disabled={isLoadingContacts}
                    >
                      {isLoadingContacts ? (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isExpanded ? "Hide Contacts" : "View Contacts"}
                    </Button>
                  </div>

                  {/* Inline Contacts Table */}
                  {isExpanded && (
                    <div className="mt-2 border rounded-md overflow-hidden">
                      {isLoadingContacts ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-caption">Loading contacts…</span>
                        </div>
                      ) : segmentContacts && segmentContacts.contacts.length > 0 ? (
                        <>
                          <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-caption text-muted-foreground">
                              {segmentContacts.total} contact{segmentContacts.total !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="overflow-x-auto max-h-64 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Email</TableHead>
                                  <TableHead className="text-xs">Name</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                  <TableHead className="text-xs">Added</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {segmentContacts.contacts.map((contact) => (
                                  <TableRow key={contact.id}>
                                    <TableCell className="text-xs font-medium font-mono">
                                      {maskEmail(contact.email)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {contact.firstName || contact.lastName
                                        ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
                                        : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {contact.unsubscribed ? (
                                        <Badge className="text-xs bg-muted text-muted-foreground hover:bg-muted">
                                          Unsubscribed
                                        </Badge>
                                      ) : (
                                        <Badge className="text-xs bg-success/10 text-success hover:bg-success/20">
                                          Subscribed
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {format(new Date(contact.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Users className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-caption text-muted-foreground">No contacts in this segment</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={!!addContactSegmentId} onOpenChange={(open) => { if (!open) handleCloseAddDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to this segment. If the contact already exists, they will be added to this segment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-email"
                type="email"
                placeholder="contact@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                disabled={isSubmitting || addSuccess}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-first-name">First Name</Label>
                <Input
                  id="add-first-name"
                  placeholder="Jane"
                  value={addFirstName}
                  onChange={(e) => setAddFirstName(e.target.value)}
                  disabled={isSubmitting || addSuccess}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-last-name">Last Name</Label>
                <Input
                  id="add-last-name"
                  placeholder="Doe"
                  value={addLastName}
                  onChange={(e) => setAddLastName(e.target.value)}
                  disabled={isSubmitting || addSuccess}
                />
              </div>
            </div>

            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}

            {addSuccess && (
              <p className="text-sm text-success">Contact added successfully.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCloseAddDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContact}
                disabled={!addEmail.trim() || isSubmitting || addSuccess}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Add Contact
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/app/(platform_admin)/platform-admin/communication/segments/
git commit -m "feat(communication): add segments page and client component"
```

---

## Task 8: Update Campaign Editor — Multi-Segment Support

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/page.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/components/CampaignEditor.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/[id]/components/CampaignSettingsPanel.tsx`

- [ ] **Step 1: Update campaign editor page**

In `campaigns/[id]/page.tsx`, replace the full file:

```typescript
import { prismadb } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { CampaignEditor } from "./components/CampaignEditor"
import { getSegments } from "@/actions/platform-admin/communication/get-segments"
import type { EmailBlock } from "@/lib/communication/types"

export default async function CampaignEditorPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params

  const [campaign, segments] = await Promise.all([
    prismadb.newsletterCampaign.findUnique({ where: { id } }),
    getSegments(),
  ])

  if (!campaign) notFound()

  return (
    <CampaignEditor
      campaign={{
        id: campaign.id,
        subject: campaign.subject,
        previewText: campaign.previewText,
        content: campaign.content,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo,
        status: campaign.status,
        segmentIds: campaign.segmentIds,
        blocks: (campaign.blocks as EmailBlock[]) ?? [],
      }}
      segments={segments}
    />
  )
}
```

- [ ] **Step 2: Update `CampaignEditor.tsx`**

Replace all audience references. The key changes are:
- Props: `audienceId: string | null` → `segmentIds: string[]`, `audiences` → `segments`
- State: `audienceId` → `segmentIds` in `campaignSettings`
- `handleSettingsSave`: spread `segmentIds` instead of `audienceId`
- `handleSendCampaign`: check `segmentIds.length > 0`
- Send dialog messages: reference "segments" not "audience"

Full replacement for `CampaignEditor.tsx`:

```typescript
"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Send, Eye, Code, Settings, AlertCircle, Save } from "lucide-react"
import { BlockPalette } from "./BlockPalette"
import { BlockCanvas } from "./BlockCanvas"
import { CampaignSettingsPanel } from "./CampaignSettingsPanel"
import { HtmlPreviewPanel } from "./HtmlPreviewPanel"
import { updateCampaign } from "@/actions/platform-admin/communication/update-campaign"
import { renderCampaignBlocks } from "@/actions/platform-admin/communication/render-campaign-blocks"
import { sendCampaign } from "@/actions/platform-admin/communication/send-campaign"
import { sendTestEmail } from "@/actions/platform-admin/communication/send-test-email"
import type { EmailBlock, CommunicationSegment } from "@/lib/communication/types"
import { generateBlockId } from "@/lib/communication/types"
import { toast } from "sonner"

interface CampaignEditorProps {
  campaign: {
    id: string
    subject: string
    previewText: string | null
    content: string
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    status: string
    segmentIds: string[]
    blocks: EmailBlock[]
  }
  segments: CommunicationSegment[]
}

export function CampaignEditor({ campaign, segments }: CampaignEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(campaign.blocks)
  const [isSaving, setIsSaving] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState<string>("preview")
  const [subject, setSubject] = useState(campaign.subject)
  const [testEmail, setTestEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [campaignSettings, setCampaignSettings] = useState({
    subject: campaign.subject,
    previewText: campaign.previewText,
    fromName: campaign.fromName,
    fromEmail: campaign.fromEmail,
    replyTo: campaign.replyTo,
    segmentIds: campaign.segmentIds,
  })

  const isReadOnly = campaign.status === "SENT" || campaign.status === "SENDING"

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subjectSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save blocks on change
  useEffect(() => {
    if (isReadOnly) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await updateCampaign(campaign.id, { blocks })
      } catch (error) {
        console.error("Auto-save failed:", error)
        toast.error("Failed to save changes")
      } finally {
        setIsSaving(false)
      }
    }, 1000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [blocks, campaign.id])

  // Render preview on block changes
  useEffect(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current)
    }

    previewTimerRef.current = setTimeout(async () => {
      if (blocks.length === 0) {
        setPreviewHtml("")
        return
      }
      setIsPreviewLoading(true)
      try {
        const result = await renderCampaignBlocks(
          blocks,
          campaignSettings.previewText ?? undefined
        )
        if (result.html) {
          setPreviewHtml(result.html)
        }
      } catch (error) {
        console.error("Preview render failed:", error)
      } finally {
        setIsPreviewLoading(false)
      }
    }, 500)

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [blocks, campaignSettings.previewText])

  const handleAddBlock = useCallback(
    (type: EmailBlock["type"]) => {
      if (isReadOnly) return

      let newBlock: EmailBlock

      switch (type) {
        case "header":
          newBlock = { id: generateBlockId(), type: "header", props: { title: "Heading" } }
          break
        case "text":
          newBlock = { id: generateBlockId(), type: "text", props: { content: "Your text here..." } }
          break
        case "button":
          newBlock = { id: generateBlockId(), type: "button", props: { text: "Click here", href: "https://" } }
          break
        case "card":
          newBlock = { id: generateBlockId(), type: "card", props: { title: "Card Title", items: ["Item 1"] } }
          break
        case "divider":
          newBlock = { id: generateBlockId(), type: "divider", props: {} as Record<string, never> }
          break
        case "badge":
          newBlock = { id: generateBlockId(), type: "badge", props: { text: "Badge", color: "blue" } }
          break
        case "image":
          newBlock = { id: generateBlockId(), type: "image", props: { src: "", alt: "Image" } }
          break
        default:
          return
      }

      setBlocks((prev) => [...prev, newBlock])
    },
    [isReadOnly]
  )

  const handleDeleteBlock = useCallback(
    (id: string) => {
      if (isReadOnly) return
      setBlocks((prev) => prev.filter((b) => b.id !== id))
    },
    [isReadOnly]
  )

  const handleSettingsSave = useCallback(
    async (data: Partial<typeof campaignSettings>) => {
      setIsSaving(true)
      try {
        const updated = { ...campaignSettings, ...data }
        setCampaignSettings(updated)

        if (data.subject !== undefined) {
          setSubject(data.subject)
        }

        await updateCampaign(campaign.id, {
          ...(data.subject !== undefined && { subject: data.subject }),
          ...(data.previewText !== undefined && { previewText: data.previewText ?? undefined }),
          ...(data.fromName !== undefined && { fromName: data.fromName ?? undefined }),
          ...(data.fromEmail !== undefined && { fromEmail: data.fromEmail ?? undefined }),
          ...(data.replyTo !== undefined && { replyTo: data.replyTo ?? undefined }),
          ...(data.segmentIds !== undefined && { segmentIds: data.segmentIds }),
        })
        toast.success("Settings saved")
      } catch (error) {
        console.error("Settings save failed:", error)
        toast.error("Failed to save settings")
      } finally {
        setIsSaving(false)
      }
    },
    [campaign.id, campaignSettings]
  )

  const handleSendCampaign = useCallback(async () => {
    if (campaignSettings.segmentIds.length === 0) return
    setIsSending(true)
    try {
      const result = await sendCampaign(campaign.id)
      if (result.success) {
        toast.success(`Campaign sent to ${result.sentCount} recipients`)
        setSendDialogOpen(false)
      } else {
        toast.error(result.error ?? "Failed to send campaign")
      }
    } catch (error) {
      console.error("Send failed:", error)
      toast.error("Failed to send campaign")
    } finally {
      setIsSending(false)
    }
  }, [campaign.id, campaignSettings.segmentIds])

  const handleSendTest = useCallback(async () => {
    if (!testEmail) return
    setIsSendingTest(true)
    try {
      const result = await sendTestEmail(campaign.id, testEmail)
      if (result.success) {
        toast.success(`Test email sent to ${testEmail}`)
        setTestDialogOpen(false)
      } else {
        toast.error(result.error ?? "Failed to send test email")
      }
    } catch (error) {
      console.error("Test send failed:", error)
      toast.error("Failed to send test email")
    } finally {
      setIsSendingTest(false)
    }
  }, [campaign.id, testEmail])

  const hasSegments = campaignSettings.segmentIds.length > 0

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Read-only banner */}
      {isReadOnly && (
        <div className="flex items-center gap-2 bg-warning/10 border-b border-warning/20 px-4 py-2 text-sm text-warning">
          <AlertCircle className="h-4 w-4" />
          This campaign has been sent and cannot be edited.
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Input
            value={subject}
            onChange={(e) => {
              const value = e.target.value
              setSubject(value)
              if (subjectSaveTimerRef.current) clearTimeout(subjectSaveTimerRef.current)
              subjectSaveTimerRef.current = setTimeout(() => {
                handleSettingsSave({ subject: value })
              }, 800)
            }}
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 w-[400px] px-0"
            placeholder="Campaign subject..."
            readOnly={isReadOnly}
          />
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="h-3 w-3 animate-pulse" />
              Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Send Test dialog */}
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isReadOnly}>
                Send Test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogDescription>
                  Send a preview of this campaign to a test email address.
                </DialogDescription>
              </DialogHeader>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleSendTest}
                  disabled={!testEmail || isSendingTest}
                >
                  {isSendingTest ? "Sending..." : "Send Test"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Send Campaign dialog */}
          <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={isReadOnly}>
                <Send className="mr-2 h-4 w-4" />
                Send Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Campaign</DialogTitle>
                <DialogDescription>
                  {hasSegments
                    ? "Are you sure you want to send this campaign? This action cannot be undone."
                    : "You need to select at least one segment in the Settings tab before sending."}
                </DialogDescription>
              </DialogHeader>
              {!hasSegments ? (
                <div className="flex items-center gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Select at least one segment in Settings first.
                </div>
              ) : (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSendCampaign}
                    disabled={isSending}
                  >
                    {isSending ? "Sending..." : "Confirm Send"}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Split pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — Block editor */}
        <div className="flex w-2/3 flex-col border-r overflow-auto">
          {!isReadOnly && (
            <div className="border-b px-4 py-3">
              <BlockPalette onAddBlock={handleAddBlock} />
            </div>
          )}
          <div className="flex-1 overflow-auto p-4">
            <BlockCanvas
              blocks={blocks}
              onChange={setBlocks}
              onDelete={handleDeleteBlock}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Right pane — Tabbed panel */}
        <div className="flex w-1/3 flex-col overflow-hidden">
          <Tabs
            value={activeRightTab}
            onValueChange={setActiveRightTab}
            className="flex flex-1 flex-col"
          >
            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
              <TabsTrigger value="preview" className="gap-1">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1">
                <Code className="h-3.5 w-3.5" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-auto p-4">
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="h-full w-full rounded border"
                  title="Email Preview"
                  sandbox=""
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {isPreviewLoading
                    ? "Rendering preview..."
                    : "Add blocks to see a preview"}
                </div>
              )}
            </TabsContent>

            <TabsContent value="html" className="flex-1 overflow-auto p-4">
              <HtmlPreviewPanel html={previewHtml} isLoading={isPreviewLoading} />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto p-4">
              <CampaignSettingsPanel
                campaign={campaignSettings}
                segments={segments}
                onSave={handleSettingsSave}
                isSaving={isSaving}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `CampaignSettingsPanel.tsx` — multi-segment select**

Replace the entire file with a multi-select checkbox UI:

```typescript
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Save } from "lucide-react"
import type { CommunicationSegment } from "@/lib/communication/types"

interface CampaignSettingsPanelProps {
  campaign: {
    subject: string
    previewText: string | null
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    segmentIds: string[]
  }
  segments: CommunicationSegment[]
  onSave: (data: Partial<{
    subject: string
    previewText: string | null
    fromName: string | null
    fromEmail: string | null
    replyTo: string | null
    segmentIds: string[]
  }>) => void
  isSaving: boolean
}

export function CampaignSettingsPanel({
  campaign,
  segments,
  onSave,
  isSaving,
}: CampaignSettingsPanelProps) {
  const [subject, setSubject] = useState(campaign.subject)
  const [previewText, setPreviewText] = useState(campaign.previewText ?? "")
  const [fromName, setFromName] = useState(campaign.fromName ?? "Oikion")
  const [fromEmail, setFromEmail] = useState(campaign.fromEmail ?? "noreply@mail.oikion.com")
  const [replyTo, setReplyTo] = useState(campaign.replyTo ?? "")
  const [segmentIds, setSegmentIds] = useState<string[]>(campaign.segmentIds)

  const showEmailWarning =
    fromEmail.length > 0 && !fromEmail.endsWith("@mail.oikion.com")

  const handleToggleSegment = (id: string) => {
    setSegmentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    onSave({
      subject,
      previewText: previewText || null,
      fromName: fromName || null,
      fromEmail: fromEmail || null,
      replyTo: replyTo || null,
      segmentIds,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Subject Line</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Preview Text</label>
        <Input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Text shown in inbox preview"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">From Name</label>
        <Input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Oikion"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">From Email</label>
        <Input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="noreply@mail.oikion.com"
        />
        {showEmailWarning && (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Domain is not mail.oikion.com — emails may have delivery issues.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Reply-to</label>
        <Input
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="replies@oikion.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Segments {segmentIds.length > 0 && <span className="text-muted-foreground font-normal">({segmentIds.length} selected)</span>}
        </label>
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No segments available. Check your Resend configuration.</p>
        ) : (
          <div className="space-y-2 rounded-md border p-3">
            {segments.map((seg) => (
              <label
                key={seg.id}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 transition-colors"
              >
                <Checkbox
                  checked={segmentIds.includes(seg.id)}
                  onCheckedChange={() => handleToggleSegment(seg.id)}
                />
                <span className="text-sm">{seg.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/
git commit -m "feat(communication): campaign editor supports multi-segment selection"
```

---

## Task 9: Update Campaigns List — Display Segment Names

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/components/CampaignsClient.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/page.tsx` (if it passes segments)

- [ ] **Step 1: Update the campaigns list table**

In `CampaignsClient.tsx`, the "Audience" column header (line 223) and cell (lines 254-258) need updating. The campaigns list only has the serialized campaign data (which now has `segmentIds: string[]`), not the segment names. For now, show the count of segments.

Change line 223:

```typescript
// OLD:
                <TableHead>Audience</TableHead>

// NEW:
                <TableHead>Segments</TableHead>
```

Change lines 254-258:

```typescript
// OLD:
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {campaign.audienceId ?? "—"}
                      </span>
                    </TableCell>

// NEW:
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {campaign.segmentIds.length > 0
                          ? `${campaign.segmentIds.length} segment${campaign.segmentIds.length !== 1 ? "s" : ""}`
                          : "—"}
                      </span>
                    </TableCell>
```

- [ ] **Step 2: Commit**

```bash
git add app/[locale]/app/(platform_admin)/platform-admin/communication/campaigns/components/CampaignsClient.tsx
git commit -m "refactor(communication): campaigns list shows segment count instead of audienceId"
```

---

## Task 10: Update Navigation, Redirect, and Translations

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/communication/page.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx` (lines 188-191)
- Modify: `locales/en/platformAdmin.json` (line 28)
- Modify: `locales/el/platformAdmin.json` (line 28)

- [ ] **Step 1: Update the communication redirect page**

In `communication/page.tsx`, change:

```typescript
// OLD:
  redirect("/platform-admin/communication/audiences")

// NEW:
  redirect("/platform-admin/communication/segments")
```

- [ ] **Step 2: Update sidebar navigation**

In `PlatformAdminSidebar.tsx`, change lines 188-191:

```typescript
// OLD:
      href: `/${locale}/app/platform-admin/communication/audiences`,
      label: t("nav.audiences"),
      ...
      active: pathname.includes("/platform-admin/communication/audiences"),

// NEW:
      href: `/${locale}/app/platform-admin/communication/segments`,
      label: t("nav.segments"),
      ...
      active: pathname.includes("/platform-admin/communication/segments"),
```

- [ ] **Step 3: Update English translations**

In `locales/en/platformAdmin.json`, change line 28:

```json
// OLD:
    "audiences": "Audiences",

// NEW:
    "segments": "Segments",
```

- [ ] **Step 4: Update Greek translations**

In `locales/el/platformAdmin.json`, change line 28:

```json
// OLD:
    "audiences": "Κοινό",

// NEW:
    "segments": "Τμήματα",
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/app/(platform_admin)/platform-admin/communication/page.tsx \
       app/[locale]/app/(platform_admin)/platform-admin/components/PlatformAdminSidebar.tsx \
       locales/en/platformAdmin.json locales/el/platformAdmin.json
git commit -m "refactor(communication): rename audiences to segments in navigation, redirect, and translations"
```

---

## Task 11: Fix Newsletter API Routes

**Files:**
- Modify: `app/api/newsletter/route.ts` (line 91)
- Modify: `app/api/newsletter/unsubscribe/route.ts` (lines 49-68)

These routes use `audienceId` as a parameter name when calling the Resend SDK. While the SDK still accepts `audienceId` for backward compatibility, we should update for consistency.

- [ ] **Step 1: Update newsletter signup route**

In `app/api/newsletter/route.ts`, the contact creation uses `audienceId: segmentId`. The variable is already correctly named `segmentId` from `RESEND_SEGMENTS`, but the Resend SDK parameter should be updated.

Change line 91:

```typescript
// OLD:
          audienceId: segmentId,

// NEW:
          segmentId: segmentId,
```

And if there's a similar reference at line 103, update it too:

```typescript
// OLD:
              audienceId: segmentId,

// NEW:
              segmentId: segmentId,
```

**Note:** The `contacts.create()` SDK method still accepts the legacy `audienceId` parameter, but using `segmentId` is more accurate. If the SDK doesn't support `segmentId` on `contacts.create()`, keep `audienceId` but add a comment noting the deprecation. Alternatively, create the contact globally and then use `resend.contacts.segments.add({ email, segmentId })`.

- [ ] **Step 2: Update unsubscribe route**

In `app/api/newsletter/unsubscribe/route.ts`, rename variables:

```typescript
// OLD (lines 49-68):
      const audienceIds = [
        RESEND_SEGMENTS.NEWSLETTER,
        RESEND_SEGMENTS.EARLY_ACCESS,
      ]
      ...
        audienceIds.map(async (audienceId) => {
          ...
              audienceId,
          ...
              `[Unsubscribe] Marked ${normalizedEmail} as unsubscribed in audience ${audienceId}`
          ...
              `[Unsubscribe] Could not update contact in audience ${audienceId}:`

// NEW:
      const segmentIds = [
        RESEND_SEGMENTS.NEWSLETTER,
        RESEND_SEGMENTS.EARLY_ACCESS,
      ]
      ...
        segmentIds.map(async (segmentId) => {
          ...
              // Note: contacts.update still uses audienceId for backward compat
              audienceId: segmentId,
          ...
              `[Unsubscribe] Marked ${normalizedEmail} as unsubscribed in segment ${segmentId}`
          ...
              `[Unsubscribe] Could not update contact in segment ${segmentId}:`
```

- [ ] **Step 3: Commit**

```bash
git add app/api/newsletter/route.ts app/api/newsletter/unsubscribe/route.ts
git commit -m "refactor(communication): update newsletter routes to use segment terminology"
```

---

## Task 12: Fix `lib/resend-segments.ts` Legacy References

**Files:**
- Modify: `lib/resend-segments.ts`

- [ ] **Step 1: Update `addContactToSegment` function**

The function at lines 46-111 uses `audienceId: process.env.RESEND_AUDIENCE_ID || "default"` in two places when calling `resend.contacts.create()` and `resend.contacts.update()`. This is legacy code that should use the segments API.

Replace the `addContactToSegment` function (lines 46-111) with:

```typescript
export async function addContactToSegment(
  email: string,
  segmentType: SegmentType
): Promise<AddToSegmentResult> {
  const resend = getResendClient();

  if (!resend) {
    return {
      success: false,
      error: "Resend API not configured",
    };
  }

  const segmentId = RESEND_SEGMENTS[segmentType];
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Create the contact globally (idempotent — safe if already exists)
    const { error: contactError } = await resend.contacts.create({
      email: normalizedEmail,
      unsubscribed: false,
    });

    if (contactError && !contactError.message?.includes("already exists")) {
      console.error("[Resend] Error creating contact:", contactError);
      // Continue anyway — the contact might already exist
    }

    // Add contact to the segment
    const { data, error } = await resend.contacts.segments.add({
      email: normalizedEmail,
      segmentId,
    });

    if (error) {
      console.error("[Resend] Error adding to segment:", error);
      return {
        success: false,
        error: error.message || "Failed to add contact to segment",
      };
    }

    console.log(`[Resend] Successfully added ${normalizedEmail} to ${segmentType} segment`);

    return {
      success: true,
      contactId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Resend] Exception adding to segment:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/resend-segments.ts
git commit -m "refactor(communication): update addContactToSegment to use segments API"
```

---

## Task 13: Delete Old Audience Files

**Files:**
- Delete: `actions/platform-admin/communication/get-audiences.ts`
- Delete: `actions/platform-admin/communication/get-audience-contacts.ts`
- Delete: `app/[locale]/app/(platform_admin)/platform-admin/communication/audiences/` (entire directory)

- [ ] **Step 1: Verify no remaining imports reference the old files**

```bash
cd /Users/stapo/Desktop/Oikion/MVP
grep -r "get-audiences\|get-audience-contacts\|getAudiences\|getAudienceContacts\|AudiencesClient\|CommunicationAudience" --include="*.ts" --include="*.tsx" -l
```

Expected: Only the files being deleted should reference these. If other files still import them, update those imports first.

- [ ] **Step 2: Delete old files**

```bash
rm actions/platform-admin/communication/get-audiences.ts
rm actions/platform-admin/communication/get-audience-contacts.ts
rm -rf app/[locale]/app/(platform_admin)/platform-admin/communication/audiences/
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(communication): remove deprecated audience files replaced by segments"
```

---

## Task 14: Build Verification

- [ ] **Step 1: Run the build**

```bash
pnpm build
```

Expected: Build succeeds with no TypeScript errors related to `audienceId`, `CommunicationAudience`, `getAudiences`, or `getAudienceContacts`.

- [ ] **Step 2: Fix any remaining type errors**

If the build fails due to remaining `audienceId` references, search and fix:

```bash
grep -r "audienceId\|CommunicationAudience\|getAudiences\|getAudienceContacts" --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 3: Deploy and verify**

After successful build, deploy and verify:
1. Navigate to `/platform-admin/communication` — should redirect to `/segments`
2. Segments page should show Newsletter, Early Access, General
3. Expanding a segment should show its contacts
4. Campaign editor Settings tab should show checkboxes for segment selection
5. Campaign sending should fetch and deduplicate contacts across selected segments

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(communication): resolve remaining audience references from segments migration"
```
