

# Changelog Email Notifications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a platform admin publishes a changelog entry, all registered users with `systemEmailEnabled = true` receive a branded email notification; admins can also manually re-send; broadcast history appears in the Newsletter dashboard.

**Architecture:** Batch send via `resend.batch.send()` (chunks of 50) using the dynamic API key from `resendHelper()`. A new `ChangelogBroadcast` Prisma model tracks each send. The Newsletter dashboard gets a third "Changelog Broadcasts" tab fed from DB records (no live Resend API calls on page load).

**Tech Stack:** Prisma ORM, `@react-email/components`, Resend SDK (`resend.batch.send`), Next.js Server Actions, shadcn/ui

---

## Task 1: Prisma Schema — Add `ChangelogBroadcast` model + fields to `ChangelogEntry`

**Files:**
- Modify: `prisma/schema.prisma` (around line 1921 for `ChangelogEntry`, end of changelog section ~line 1942)

**Step 1: Add fields to `ChangelogEntry`**

In `prisma/schema.prisma`, find the `ChangelogEntry` model and add three new fields + relation:

```prisma
model ChangelogEntry {
  id               String          @id @default(uuid())
  version          String
  title            String
  description      String
  customCategoryId String?
  status           ChangelogStatus @default(DRAFT)
  tags             Json?
  publishedAt      DateTime?
  createdById      String
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  // NEW — notification tracking
  lastNotifiedAt   DateTime?
  broadcastCount   Int             @default(0)
  broadcasts       ChangelogBroadcast[]

  customCategory ChangelogCustomCategory? @relation(fields: [customCategoryId], references: [id], onDelete: SetNull)
  createdBy      Users                    @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([publishedAt])
  @@index([version])
  @@index([createdById])
  @@index([customCategoryId])
}
```

**Step 2: Add the `ChangelogBroadcast` model**

Directly after the `ChangelogEntry` model (before the `ChangelogStatus` enum), add:

```prisma
model ChangelogBroadcast {
  id               String   @id @default(uuid())
  changelogEntryId String
  sentAt           DateTime @default(now())
  recipientCount   Int
  resendEmailIds   String[]
  sentById         String

  changelogEntry   ChangelogEntry @relation(fields: [changelogEntryId], references: [id], onDelete: Cascade)
  sentBy           Users          @relation(fields: [sentById], references: [id], onDelete: Cascade)

  @@index([changelogEntryId])
  @@index([sentAt])
}
```

**Step 3: Add back-relation on `Users` model**

Find the `Users` model and add (near the other `ChangelogEntry` relation):
```prisma
ChangelogBroadcast   ChangelogBroadcast[]
```

**Step 4: Run migration**

```bash
pnpm db:migrate
# When prompted for migration name, enter: add_changelog_broadcasts
```

Expected output: `The following migration(s) have been created and applied: migrations/[timestamp]_add_changelog_broadcasts`

**Step 5: Regenerate Prisma client**

```bash
pnpm prisma generate
```

Expected output: `Generated Prisma Client`

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ChangelogBroadcast model and notification fields to ChangelogEntry"
```

---

## Task 2: Email Template — `ChangelogNotification.tsx`

**Files:**
- Create: `emails/changelog/ChangelogNotification.tsx`

The template composes existing `BaseLayout` components for visual consistency.

**Step 1: Create the directory and file**

```bash
mkdir -p emails/changelog
```

Create `emails/changelog/ChangelogNotification.tsx`:

```tsx
import {
  Hr,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Markdown } from "@react-email/markdown";
import * as React from "react";
import {
  BaseLayout,
  EmailBadge,
  EmailCTAButton,
  BADGE_COLORS,
  baseUrl,
} from "@/emails/components/BaseLayout";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Oikion";

export interface ChangelogNotificationProps {
  username: string;
  email: string;
  version: string;
  title: string;
  description: string;
  category: { name: string; color: string; icon: string } | null;
  tags: { name: string; color: string }[];
  publishedAt: string;
}

// Map changelog category colors to BADGE_COLORS keys
const colorToBadgeClass: Record<string, string> = {
  blue: BADGE_COLORS.blue,
  indigo: BADGE_COLORS.indigo,
  purple: BADGE_COLORS.purple,
  pink: BADGE_COLORS.pink,
  red: BADGE_COLORS.red,
  orange: BADGE_COLORS.orange,
  amber: BADGE_COLORS.amber,
  green: BADGE_COLORS.green,
  emerald: BADGE_COLORS.emerald,
  cyan: BADGE_COLORS.cyan,
};

export const ChangelogNotification = ({
  username,
  email,
  version,
  title,
  description,
  category,
  tags,
  publishedAt,
}: ChangelogNotificationProps) => {
  const previewText = `What's new in ${appName} — v${version}: ${title}`;
  const changelogUrl = `${baseUrl}/changelog`;
  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const badgeColor = category
    ? colorToBadgeClass[category.color] || BADGE_COLORS.blue
    : BADGE_COLORS.blue;

  return (
    <BaseLayout
      previewText={previewText}
      footerText={`You received this because you are a registered ${appName} user.`}
    >
      {/* Category badge */}
      <EmailBadge
        icon={category ? "🔖" : "📋"}
        text={category ? category.name : "Platform Update"}
        colorClass={badgeColor}
      />

      {/* Version + Title */}
      <Section className="mb-2 text-center">
        <Text className="text-zinc-400 text-xs font-mono m-0 mb-1 tracking-wider uppercase">
          v{version}
        </Text>
      </Section>
      <Text className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-2 leading-tight">
        {title}
      </Text>
      <Text className="text-zinc-500 text-xs text-center m-0 mb-6">
        Released {publishedAt}
      </Text>

      {/* Tags row */}
      {tags.length > 0 && (
        <Section className="mb-4 text-center">
          <Text className="text-zinc-500 text-xs m-0">
            {tags.map((t) => t.name).join(" · ")}
          </Text>
        </Section>
      )}

      <Hr className="border-zinc-200 my-6" />

      {/* Greeting */}
      <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
        Hello {username},
      </Text>

      {/* Description */}
      <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-6">
        <div className="text-zinc-700 text-sm leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-blue-600 [&>a]:underline [&>h1]:text-lg [&>h1]:font-semibold [&>h2]:text-base [&>h2]:font-semibold [&>h3]:text-sm [&>h3]:font-semibold [&>blockquote]:border-l-4 [&>blockquote]:border-zinc-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-zinc-600">
          <Markdown>{description}</Markdown>
        </div>
      </Section>

      {/* CTA */}
      <EmailCTAButton href={changelogUrl} text="View Full Changelog" />

      {/* Admin note */}
      <Text className="text-zinc-500 text-xs text-center m-0 mt-4">
        Sent by the {appName} Team
      </Text>

      {/* Unsubscribe */}
      <Text className="text-zinc-400 text-xs text-center m-0 mt-4">
        <Link href={unsubscribeUrl} className="text-zinc-500 underline">
          Unsubscribe from product updates
        </Link>
        {" · "}
        <Link href={`${baseUrl}/legal/privacy-policy`} className="text-zinc-500 underline">
          Privacy Policy
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ChangelogNotification;
```

**Step 2: Verify the file compiles**

```bash
pnpm build 2>&1 | grep -E "error|ChangelogNotification" | head -20
```

Expected: no TypeScript errors for the new file.

**Step 3: Commit**

```bash
git add emails/changelog/ChangelogNotification.tsx
git commit -m "feat: add ChangelogNotification email template"
```

---

## Task 3: Server Actions — `sendChangelogNotification` + `getChangelogBroadcasts`

**Files:**
- Modify: `actions/platform-admin/changelog-actions.ts`

**Step 1: Add imports at the top of `changelog-actions.ts`**

After the existing imports block, add:

```ts
import { render } from "@react-email/render";
import { ChangelogNotification } from "@/emails/changelog/ChangelogNotification";
import resendHelper from "@/lib/resend";
import { format } from "date-fns";
```

**Step 2: Add the `ChangelogBroadcastData` export type**

After the existing `ChangelogEntryData` interface, add:

```ts
export interface ChangelogBroadcastData {
  id: string;
  changelogEntryId: string;
  sentAt: string;
  recipientCount: number;
  emailCount: number; // resendEmailIds.length
  sentBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  entry: {
    version: string;
    title: string;
  };
}
```

**Step 3: Add `sendChangelogNotification` action**

Append to the bottom of `changelog-actions.ts`:

```ts
// ============================================
// NOTIFICATION BROADCAST ACTIONS
// ============================================

/**
 * Send changelog notification email to all opted-in registered users
 * Auto-triggered on publish and available as manual resend for published entries
 * Requires platform admin access
 */
export async function sendChangelogNotification(
  changelogEntryId: string
): Promise<ActionResult & { recipientCount?: number; broadcastId?: string }> {
  try {
    const admin = await requirePlatformAdmin();

    if (!changelogEntryId) {
      return { success: false, error: "Entry ID is required" };
    }

    // Fetch the changelog entry — must be PUBLISHED
    const entry = await prismadb.changelogEntry.findUnique({
      where: { id: changelogEntryId },
      include: {
        customCategory: true,
      },
    });

    if (!entry) {
      return { success: false, error: "Changelog entry not found" };
    }

    if (entry.status !== ChangelogStatus.PUBLISHED) {
      return { success: false, error: "Only published entries can be sent as notifications" };
    }

    // Get the admin's DB user (for sentById)
    const adminUser = await prismadb.users.findUnique({
      where: { clerkUserId: admin.clerkId },
      select: { id: true },
    });

    if (!adminUser) {
      return { success: false, error: "Admin user not found" };
    }

    // Fetch all opted-in users (systemEmailEnabled = true, or no settings row = default true)
    const recipients = await prismadb.users.findMany({
      where: {
        email: { not: null },
        OR: [
          { UserNotificationSettings: { systemEmailEnabled: true } },
          { UserNotificationSettings: null },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (recipients.length === 0) {
      return { success: false, error: "No opted-in recipients found" };
    }

    // Prepare template data
    const resend = await resendHelper();
    const tags = (entry.tags as Array<{ name: string; color: string }>) || [];
    const publishedAtFormatted = entry.publishedAt
      ? format(entry.publishedAt, "MMMM d, yyyy")
      : format(new Date(), "MMMM d, yyyy");

    // Build email batch entries
    const BATCH_SIZE = 50;
    const allEmailIds: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);

      const emails = await Promise.all(
        chunk.map(async (user) => {
          const html = await render(
            ChangelogNotification({
              username: user.firstName || user.email!.split("@")[0],
              email: user.email!,
              version: entry.version,
              title: entry.title,
              description: entry.description,
              category: entry.customCategory
                ? {
                    name: entry.customCategory.name,
                    color: entry.customCategory.color,
                    icon: entry.customCategory.icon,
                  }
                : null,
              tags,
              publishedAt: publishedAtFormatted,
            })
          );

          return {
            from: `Oikion <noreply@mail.oikion.com>`,
            to: user.email!,
            subject: `What's new in Oikion — v${entry.version}: ${entry.title}`,
            html,
          };
        })
      );

      const { data, error } = await resend.batch.send(emails);

      if (error) {
        console.error("[SEND_CHANGELOG_NOTIFICATION] Batch error:", error);
        // Continue with remaining batches — partial success is acceptable
      }

      if (data) {
        const ids = data
          .filter((r): r is { id: string } => r !== null && typeof r.id === "string")
          .map((r) => r.id);
        allEmailIds.push(...ids);
      }
    }

    // Create broadcast record
    const broadcast = await prismadb.changelogBroadcast.create({
      data: {
        changelogEntryId,
        recipientCount: recipients.length,
        resendEmailIds: allEmailIds,
        sentById: adminUser.id,
      },
    });

    // Update the changelog entry
    await prismadb.changelogEntry.update({
      where: { id: changelogEntryId },
      data: {
        lastNotifiedAt: new Date(),
        broadcastCount: { increment: 1 },
      },
    });

    await logAdminAction(admin.clerkId, "SEND_CHANGELOG_NOTIFICATION", changelogEntryId, {
      recipientCount: recipients.length,
      emailsSent: allEmailIds.length,
      broadcastId: broadcast.id,
    });

    revalidatePath("/app/platform-admin/changelog");
    revalidatePath("/app/platform-admin/newsletter");

    return {
      success: true,
      recipientCount: recipients.length,
      broadcastId: broadcast.id,
    };
  } catch (error) {
    console.error("[SEND_CHANGELOG_NOTIFICATION]", error);
    return { success: false, error: "Failed to send changelog notification" };
  }
}

/**
 * Get changelog broadcast history
 * Optionally filtered by a specific changelog entry
 * Requires platform admin access
 */
export async function getChangelogBroadcasts(options?: {
  changelogEntryId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ broadcasts: ChangelogBroadcastData[]; total: number }> {
  try {
    await requirePlatformAdmin();

    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where = options?.changelogEntryId
      ? { changelogEntryId: options.changelogEntryId }
      : {};

    const [broadcasts, total] = await Promise.all([
      prismadb.changelogBroadcast.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { sentAt: "desc" },
        include: {
          sentBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          changelogEntry: {
            select: { version: true, title: true },
          },
        },
      }),
      prismadb.changelogBroadcast.count({ where }),
    ]);

    return {
      broadcasts: broadcasts.map((b) => ({
        id: b.id,
        changelogEntryId: b.changelogEntryId,
        sentAt: b.sentAt.toISOString(),
        recipientCount: b.recipientCount,
        emailCount: b.resendEmailIds.length,
        sentBy: b.sentBy,
        entry: {
          version: b.changelogEntry.version,
          title: b.changelogEntry.title,
        },
      })),
      total,
    };
  } catch (error) {
    console.error("[GET_CHANGELOG_BROADCASTS]", error);
    return { broadcasts: [], total: 0 };
  }
}
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

**Step 5: Commit**

```bash
git add actions/platform-admin/changelog-actions.ts
git commit -m "feat: add sendChangelogNotification and getChangelogBroadcasts server actions"
```

---

## Task 4: ChangelogClient UI — Bell Button + Auto-Notify on Publish

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/changelog/components/ChangelogClient.tsx`

**Step 1: Add `sendChangelogNotification` to imports**

Find the existing import from `changelog-actions`:
```ts
import {
  deleteChangelogEntry,
  publishChangelogEntry,
  type ChangelogEntryData,
} from "@/actions/platform-admin/changelog-actions";
```

Replace with:
```ts
import {
  deleteChangelogEntry,
  publishChangelogEntry,
  sendChangelogNotification,
  type ChangelogEntryData,
} from "@/actions/platform-admin/changelog-actions";
```

**Step 2: Add `BellRing` to lucide imports**

Find the lucide-react import block and add `BellRing` to the list.

**Step 3: Add state for notify loading**

Find the existing state declarations block (near line 163) and add:
```ts
const [isNotifying, setIsNotifying] = useState<string | null>(null);
const [notifyConfirm, setNotifyConfirm] = useState<ChangelogEntryData | null>(null);
```

**Step 4: Replace `handlePublish` with notify-on-publish version**

Find the existing `handlePublish` function and replace it entirely:

```ts
const handlePublish = async (id: string) => {
  setIsPublishing(id);
  try {
    const publishResult = await publishChangelogEntry(id);
    if (!publishResult.success) {
      toast.error(publishResult.error || "Failed to publish entry");
      return;
    }
    toast.success("Entry published! Sending notifications...");
    router.refresh();

    // Fire-and-forget notification — non-blocking
    const notifyResult = await sendChangelogNotification(id);
    if (notifyResult.success) {
      toast.success(`Notified ${notifyResult.recipientCount} users`);
    } else {
      toast.error(`Published, but notification failed: ${notifyResult.error}`);
    }
  } catch {
    toast.error("An error occurred");
  } finally {
    setIsPublishing(null);
  }
};
```

**Step 5: Add `handleNotify` function for manual resend**

After `handlePublish`, add:

```ts
const handleNotify = async () => {
  if (!notifyConfirm) return;
  setIsNotifying(notifyConfirm.id);
  try {
    const result = await sendChangelogNotification(notifyConfirm.id);
    if (result.success) {
      toast.success(`Notified ${result.recipientCount} users`);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to send notification");
    }
  } catch {
    toast.error("An error occurred");
  } finally {
    setIsNotifying(null);
    setNotifyConfirm(null);
  }
};
```

**Step 6: Add Bell button in the actions column**

Find the actions column in the table rows (the `div.flex.items-center.justify-end` block). After the Edit button and before the Publish (Send) button, add:

```tsx
{entry.status === "PUBLISHED" && (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => setNotifyConfirm(entry)}
    disabled={isNotifying === entry.id}
    title="Send notification email to users"
  >
    <BellRing className="h-4 w-4" />
  </Button>
)}
```

**Step 7: Add confirmation AlertDialog for manual notify**

After the existing Delete AlertDialog (around line 600), add:

```tsx
{/* Notify Confirmation */}
<AlertDialog open={!!notifyConfirm} onOpenChange={() => setNotifyConfirm(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Send Changelog Notification?</AlertDialogTitle>
      <AlertDialogDescription>
        Send an email notification for{" "}
        <span className="font-semibold">v{notifyConfirm?.version}: {notifyConfirm?.title}</span>{" "}
        to all opted-in users.
        {notifyConfirm && (notifyConfirm as ChangelogEntryData & { broadcastCount?: number }).broadcastCount
          ? ` This entry has been sent before.`
          : ""}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={!!isNotifying}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleNotify} disabled={!!isNotifying}>
        {isNotifying ? "Sending..." : "Send Notification"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Note:** `ChangelogEntryData` will need `broadcastCount?: number` and `lastNotifiedAt?: string | null` added to its interface in `changelog-actions.ts`. Add these to the interface:

```ts
export interface ChangelogEntryData {
  // ... existing fields ...
  lastNotifiedAt: string | null;
  broadcastCount: number;
}
```

And update `getChangelogEntries` to include them in the mapped return:
```ts
lastNotifiedAt: entry.lastNotifiedAt?.toISOString() || null,
broadcastCount: entry.broadcastCount,
```

**Step 8: Verify the build**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

**Step 9: Commit**

```bash
git add app/[locale]/app/\(platform_admin\)/platform-admin/changelog/components/ChangelogClient.tsx \
        actions/platform-admin/changelog-actions.ts
git commit -m "feat: add changelog notify-on-publish and manual Bell button in admin UI"
```

---

## Task 5: Newsletter Page + NewsletterClient — Changelog Broadcasts Tab

**Files:**
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/newsletter/page.tsx`
- Modify: `app/[locale]/app/(platform_admin)/platform-admin/newsletter/components/NewsletterClient.tsx`

### Part A — Update `newsletter/page.tsx`

**Step 1: Add import for `getChangelogBroadcasts`**

At the top of the file:
```ts
import { getChangelogBroadcasts } from "@/actions/platform-admin/changelog-actions";
```

**Step 2: Fetch broadcasts alongside existing data**

In the page component, add the broadcasts query in parallel with the existing queries:

```ts
const { broadcasts, total: totalBroadcasts } = await getChangelogBroadcasts({
  page: currentPage,
  pageSize,
});
```

**Step 3: Pass broadcasts to `NewsletterClient`**

Add to the `<NewsletterClient>` JSX:
```tsx
broadcasts={broadcasts}
totalBroadcasts={totalBroadcasts}
totalBroadcastPages={Math.ceil(totalBroadcasts / pageSize)}
```

### Part B — Update `NewsletterClient.tsx`

**Step 1: Add `ChangelogBroadcastData` import**

```ts
import type { ChangelogBroadcastData } from "@/actions/platform-admin/changelog-actions";
```

**Step 2: Add `ExternalLink` to lucide imports**

Add `ExternalLink` and `BellRing` to the existing lucide import.

**Step 3: Extend the props interface**

Add to `NewsletterClientProps`:
```ts
broadcasts: ChangelogBroadcastData[];
totalBroadcasts: number;
totalBroadcastPages: number;
```

**Step 4: Destructure new props in the component**

```ts
export function NewsletterClient({
  campaigns,
  subscribers,
  broadcasts,
  stats,
  currentPage,
  totalCampaignPages,
  totalSubscriberPages,
  totalBroadcastPages,
  currentTab,
  locale,
}: NewsletterClientProps) {
```

**Step 5: Update `totalPages` logic**

Find:
```ts
const totalPages = activeTab === "campaigns" ? totalCampaignPages : totalSubscriberPages;
```

Replace with:
```ts
const totalPages =
  activeTab === "campaigns"
    ? totalCampaignPages
    : activeTab === "subscribers"
    ? totalSubscriberPages
    : totalBroadcastPages;
```

**Step 6: Update the `<Tabs>` grid to 3 columns**

Find `className="inline-grid grid-cols-2"` and change to `grid-cols-3`.

**Step 7: Add the third `<TabsTrigger>`**

After the Subscribers trigger, add:
```tsx
<TabsTrigger value="broadcasts">
  <BellRing className="h-4 w-4 shrink-0" />
  Broadcasts ({totalBroadcasts})
</TabsTrigger>
```

**Step 8: Add the `<TabsContent value="broadcasts">` section**

After the Subscribers `</TabsContent>`, add:

```tsx
{/* Changelog Broadcasts Tab */}
<TabsContent value="broadcasts">
  <Card>
    <CardHeader>
      <CardTitle>Changelog Broadcasts</CardTitle>
      <CardDescription>
        History of changelog notification emails sent to registered users
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Emails Sent</TableHead>
            <TableHead>Sent By</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead className="text-right">Resend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {broadcasts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <BellRing className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No changelog broadcasts yet</p>
                <p className="text-sm text-muted-foreground">
                  Publish a changelog entry to send the first notification
                </p>
              </TableCell>
            </TableRow>
          ) : (
            broadcasts.map((broadcast) => (
              <TableRow key={broadcast.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    v{broadcast.entry.version}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium truncate max-w-[180px]">
                    {broadcast.entry.title}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {broadcast.recipientCount}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3 text-muted-foreground" />
                    {broadcast.emailCount}
                    {broadcast.emailCount < broadcast.recipientCount && (
                      <Badge variant="outline" className="text-xs text-warning ml-1">
                        {broadcast.recipientCount - broadcast.emailCount} failed
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {broadcast.sentBy
                    ? `${broadcast.sentBy.firstName || ""} ${broadcast.sentBy.lastName || ""}`.trim() ||
                      broadcast.sentBy.email
                    : "—"}
                </TableCell>
                <TableCell>
                  {format(new Date(broadcast.sentAt), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href="https://resend.com/emails"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View in Resend dashboard"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</TabsContent>
```

**Step 9: Verify the build**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors.

**Step 10: Commit**

```bash
git add app/[locale]/app/\(platform_admin\)/platform-admin/newsletter/page.tsx \
        app/[locale]/app/\(platform_admin\)/platform-admin/newsletter/components/NewsletterClient.tsx
git commit -m "feat: add Changelog Broadcasts tab to Newsletter dashboard"
```

---

## Task 6: Final Build Verification

**Step 1: Full build**

```bash
pnpm build
```

Expected: exits with code 0, no TypeScript or compilation errors.

**Step 2: Manual smoke test checklist**

1. Navigate to `/app/platform-admin/changelog`
2. Create a new entry as DRAFT — confirm no notification sent
3. Click Publish (Send icon) on a DRAFT entry — confirm:
   - Toast: `"Entry published! Sending notifications..."`
   - Follow-up toast: `"Notified X users"`
4. On a PUBLISHED entry, click the Bell icon — confirm `AlertDialog` appears
5. Confirm send in `AlertDialog` — confirm success toast
6. Navigate to `/app/platform-admin/newsletter` → "Changelog Broadcasts" tab
7. Confirm broadcast rows appear with correct version, recipient count, sent by, sent at
8. Confirm "View in Resend" button opens `https://resend.com/emails`

**Step 3: Commit final verification tag (optional)**

```bash
git commit --allow-empty -m "chore: changelog email notification feature complete"
```
