# Audiences Removal + Group DMs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete the Audiences feature entirely and integrate Group DM creation (with post-creation member management) natively into the Messages feature.

**Architecture:** The `Conversation` model already supports `isGroup` and `name` — no new schema is needed for group DMs. We drop the `Audience`/`AudienceMember` tables, delete all Audiences UI/API/action surface, then upgrade `StartDMDialog` with a DM/Group tab and `ConversationSettings` with a Members panel. A new `createGroupConversation` action and `addGroupMember`/`removeGroupMember` actions back the UI.

**Tech Stack:** Next.js 16, Prisma ORM, React 19, SWR (useSWRMutation), shadcn/ui, next-intl

---

## Task 1: Remove Audience models from Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Open schema and make these changes**

In `prisma/schema.prisma`, delete the entire `Audience` model block (lines ~79–94):
```
model Audience { ... }
```

Delete the entire `AudienceMember` model block (lines ~96–107):
```
model AudienceMember { ... }
```

On the `SharedEntity` model, delete these two lines:
```prisma
  audienceId                             String?
  Audience                               Audience?        @relation(fields: [audienceId], references: [id])
```

On the `Users` model, find and delete these two relation lines:
```prisma
  Audience                                           Audience[]
  AudienceMember                                     AudienceMember[]
```

**Step 2: Verify schema is valid**
```bash
pnpm prisma validate
```
Expected: "The schema at prisma/schema.prisma is valid!"

---

## Task 2: Create and apply the Prisma migration

**Files:**
- New: `prisma/migrations/<timestamp>_remove_audiences/migration.sql`

**Step 1: Create the migration**
```bash
pnpm db:migrate
```
When prompted for a name, enter: `remove_audiences`

**Step 2: Inspect the generated SQL**

Open the generated migration file. It should contain:
```sql
DROP TABLE IF EXISTS "AudienceMember";
DROP TABLE IF EXISTS "Audience";
ALTER TABLE "SharedEntity" DROP COLUMN IF EXISTS "audienceId";
```
(Exact names may be quoted differently — verify it looks right, no data you need is being dropped.)

**Step 3: Regenerate the Prisma client**
```bash
pnpm prisma generate
```
Expected: "Generated Prisma Client"

**Step 4: Commit**
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(audiences): drop Audience and AudienceMember tables from schema"
```

---

## Task 3: Delete Audiences API routes

**Files:**
- Delete: `app/api/audiences/route.ts`
- Delete: `app/api/audiences/[id]/route.ts`
- Delete: `app/api/audiences/[id]/members/route.ts`
- Delete: `app/api/audiences/[id]/sync/route.ts`

**Step 1: Delete the files**
```bash
rm -rf app/api/audiences
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat(audiences): delete Audiences API routes"
```

---

## Task 4: Delete Audiences server actions and messaging bridge

**Files:**
- Delete: `actions/audiences/` (entire directory)
- Delete: `actions/messaging/audience-conversations.ts`

**Step 1: Delete**
```bash
rm -rf actions/audiences
rm actions/messaging/audience-conversations.ts
```

**Step 2: Check for any imports of these files elsewhere**
```bash
grep -r "audience-conversations\|actions/audiences" --include="*.ts" --include="*.tsx" .
```
Expected: No matches. If matches exist, remove those import lines.

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(audiences): delete audience server actions and messaging bridge"
```

---

## Task 5: Delete Audiences UI and locale files

**Files:**
- Delete: `app/[locale]/app/(routes)/network/audiences/` (entire directory)
- Delete: `locales/en/audiences.json`
- Delete: `locales/el/audiences.json`

**Step 1: Delete**
```bash
rm -rf "app/[locale]/app/(routes)/network/audiences"
rm -f locales/en/audiences.json locales/el/audiences.json
```

**Step 2: Check for any remaining imports**
```bash
grep -r "network/audiences\|AudiencesPageView\|AudienceCard\|CreateAudienceDialog\|AudienceMemberManager" --include="*.ts" --include="*.tsx" .
```
Expected: No matches.

**Step 3: Commit**
```bash
git add -A
git commit -m "feat(audiences): delete Audiences UI pages and locale files"
```

---

## Task 6: Remove Audiences from navigation config

**Files:**
- Modify: `config/navigation.tsx`

**Step 1: Read the file and find the audiences block**

In `config/navigation.tsx`, find this block (around line 174):
```tsx
...(canAccess("audiences") ? [{
  title: dict.navigation.ModuleMenu.social?.audiences || "Audiences",
  url: "/app/network/audiences",
  icon: UsersIcon,
  isActive: isRouteActive(pathname, "/app/network/audiences", locale),
  moduleId: "audiences" as ModuleId,
}] : []),
```

**Step 2: Delete that entire block** (the `...(canAccess("audiences") ? [...] : []),` spread)

**Step 3: Check for "audiences" ModuleId usage**
```bash
grep -r '"audiences"' --include="*.ts" --include="*.tsx" .
```
If found in `lib/permissions/types.ts` or a module config, remove `"audiences"` from the `ModuleId` union/array.

**Step 4: Check navigation locale keys**

In `locales/en/navigation.json` and `locales/el/navigation.json`, find and remove any `"audiences"` key under `ModuleMenu.social`.

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(audiences): remove Audiences from navigation config and permissions"
```

---

## Task 7: Add `createGroupConversation` server action

**Files:**
- Modify: `actions/messaging/direct-messages.ts`

**Step 1: Add the function at the end of the file**

```typescript
/**
 * Create a named group conversation with multiple org members
 */
export async function createGroupConversation(
  participantIds: string[],
  name?: string
): Promise<{
  success: boolean;
  conversationId?: string;
  error?: string;
}> {
  try {
    const guard = await requireAction("messaging:create_dm");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    if (participantIds.length < 2) {
      return { success: false, error: "A group requires at least 2 participants" };
    }

    // Deduplicate and ensure current user is included
    const allParticipants = Array.from(
      new Set([currentUser.id, ...participantIds])
    );

    const conversationId = await generateFriendlyId(
      prismadb,
      "Conversation",
      organizationId
    );

    const conversation = await prismadb.conversation.create({
      data: {
        id: conversationId,
        organizationId,
        name: name?.trim() || null,
        isGroup: true,
        createdById: currentUser.id,
        participants: {
          create: allParticipants.map((userId) => ({ userId })),
        },
      },
    });

    // Notify other participants via Ably
    try {
      const { publishToChannel, getUserChannelName } = await import("@/lib/ably");
      for (const userId of allParticipants) {
        if (userId !== currentUser.id) {
          await publishToChannel(getUserChannelName(userId), "conversation:created", {
            id: conversation.id,
            name: conversation.name,
            isGroup: true,
          });
        }
      }
    } catch {
      // Ably not configured, skip
    }

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    console.error("[MESSAGING] Create group conversation error:", error);
    return { success: false, error: "Failed to create group conversation" };
  }
}
```

**Step 2: Verify the import list at the top of the file already has** `requireAction`, `generateFriendlyId`, `getCurrentUser`, `getCurrentOrgId`, `prismadb`. They should all be there — add any missing ones.

**Step 3: Commit**
```bash
git add actions/messaging/direct-messages.ts
git commit -m "feat(messages): add createGroupConversation server action"
```

---

## Task 8: Add `addGroupMember` and `removeGroupMember` server actions

**Files:**
- Create: `actions/messaging/group-members.ts`

**Step 1: Create the file**

```typescript
"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { requireAction } from "@/lib/permissions";

/**
 * Add an org member to an existing group conversation
 */
export async function addGroupMember(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireAction("messaging:create_dm");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Verify the conversation is a group in this org
    const conversation = await prismadb.conversation.findFirst({
      where: { id: conversationId, organizationId, isGroup: true },
      include: { participants: { where: { leftAt: null } } },
    });

    if (!conversation) {
      return { success: false, error: "Group conversation not found" };
    }

    // Verify the calling user is a participant
    const isMember = conversation.participants.some(
      (p) => p.userId === currentUser.id
    );
    if (!isMember) {
      return { success: false, error: "Not a member of this conversation" };
    }

    // Upsert participant (handles re-add after leave)
    await prismadb.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId },
      update: { leftAt: null },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Add group member error:", error);
    return { success: false, error: "Failed to add member" };
  }
}

/**
 * Remove a member from a group conversation
 * Users cannot remove the creator or themselves (use leaveConversation for self)
 */
export async function removeGroupMember(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const guard = await requireAction("messaging:create_dm");
    if (guard) return guard;

    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const conversation = await prismadb.conversation.findFirst({
      where: { id: conversationId, organizationId, isGroup: true },
    });

    if (!conversation) {
      return { success: false, error: "Group conversation not found" };
    }

    // Cannot remove the creator
    if (conversation.createdById === userId) {
      return { success: false, error: "Cannot remove the group creator" };
    }

    // Cannot remove yourself via this action (use leave)
    if (userId === currentUser.id) {
      return { success: false, error: "Use 'Leave conversation' to remove yourself" };
    }

    await prismadb.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { leftAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("[MESSAGING] Remove group member error:", error);
    return { success: false, error: "Failed to remove member" };
  }
}
```

**Step 2: Commit**
```bash
git add actions/messaging/group-members.ts
git commit -m "feat(messages): add addGroupMember and removeGroupMember server actions"
```

---

## Task 9: Add `useStartGroupDM` SWR hook

**Files:**
- Modify: `hooks/swr/useMessaging.ts`

**Step 1: Find the `useStartDM` function** (around line 406) and add the following function directly after it:

```typescript
/**
 * Hook to create a group DM conversation with multiple org members
 */
export function useStartGroupDM() {
  const { mutate: globalMutate } = useSWRConfig();

  const { trigger, isMutating, error } = useSWRMutation<
    { conversationId: string },
    Error,
    string,
    { participantIds: string[]; name?: string }
  >(
    "/api/messaging/conversations/group",
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create group conversation");
      }
      return res.json();
    },
    {
      onSuccess: () => {
        globalMutate("/api/messaging/conversations");
      },
    }
  );

  return {
    startGroupDM: trigger,
    isStarting: isMutating,
    error,
  };
}
```

**Step 2: Create the API route this hook calls**

Create file `app/api/messaging/conversations/group/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGroupConversation } from "@/actions/messaging/direct-messages";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { participantIds, name } = body;

  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json(
      { error: "At least 2 participant IDs required" },
      { status: 400 }
    );
  }

  const result = await createGroupConversation(participantIds, name);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ conversationId: result.conversationId });
}
```

**Step 3: Commit**
```bash
git add hooks/swr/useMessaging.ts app/api/messaging/conversations/group/route.ts
git commit -m "feat(messages): add useStartGroupDM hook and API route"
```

---

## Task 10: Upgrade `StartDMDialog` with Group DM tab

**Files:**
- Modify: `app/[locale]/app/(routes)/network/messages/components/StartDMDialog.tsx`

**Step 1: Read the full file** before making any changes.

**Step 2: Replace the file with the group-mode-aware version**

Key structural changes from current code:
- Add `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"`
- Add `import { useStartGroupDM } from "@/hooks/swr/useMessaging"`
- Add `import { X } from "lucide-react"` for chip dismiss button
- Change `selection: Selection | null` state to `selection: Selection | null` (kept for DM mode)
- Add `groupSelections: string[]` state (array of user IDs for group mode)
- Add `groupName: string` state
- Add `mode: "dm" | "group"` state (default `"dm"`)
- Import and call `useStartGroupDM`

**The dialog JSX structure:**

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        New Message
      </DialogTitle>
    </DialogHeader>

    {/* Mode tabs */}
    <Tabs value={mode} onValueChange={(v) => { setMode(v as "dm" | "group"); setSelection(null); setGroupSelections([]); setGroupName(""); }}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dm">Direct Message</TabsTrigger>
        <TabsTrigger value="group">Group DM</TabsTrigger>
      </TabsList>

      {/* === DM TAB: unchanged existing logic === */}
      <TabsContent value="dm" className="mt-4">
        {/* ... existing search + list + selected preview ... */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStartingDM}>Cancel</Button>
          <Button onClick={handleStartDM} disabled={!selection || isStartingDM}>
            {isStartingDM ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</> : "Start Conversation"}
          </Button>
        </DialogFooter>
      </TabsContent>

      {/* === GROUP TAB === */}
      <TabsContent value="group" className="mt-4 space-y-3">
        {/* Optional name field */}
        <Input
          placeholder={groupSelections.length >= 2
            ? groupSelections.slice(0, 3).map(id => users?.find(u => u.id === id)?.name?.split(" ")[0] ?? "").join(", ")
            : "Group name (optional)"}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Selected chips */}
        {groupSelections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {groupSelections.map((id) => {
              const user = users?.find((u) => u.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  {user?.name ?? id}
                  <button type="button" onClick={() => setGroupSelections((prev) => prev.filter((s) => s !== id))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Team member list (multi-select — org users only) */}
        <div className="rounded-lg border">
          <ScrollArea className="h-[240px]">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Team Members</div>
                {filteredUsers.map((user) => {
                  const isSelected = groupSelections.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setGroupSelections((prev) =>
                        isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                      )}
                      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-left hover:bg-accent outline-none cursor-pointer transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(user.name || user.email || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isStartingGroup}>Cancel</Button>
          <Button onClick={handleCreateGroup} disabled={groupSelections.length < 2 || isStartingGroup}>
            {isStartingGroup ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : `Create Group${groupSelections.length >= 2 ? ` (${groupSelections.length + 1})` : ""}`}
          </Button>
        </DialogFooter>
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

**Step 3: Add `handleCreateGroup` function** (alongside existing `handleStartDM`):

```typescript
const handleCreateGroup = async () => {
  if (groupSelections.length < 2) return;
  try {
    const result = await startGroupDM({
      participantIds: groupSelections,
      name: groupName.trim() || undefined,
    });
    if (result?.conversationId) {
      router.push(`/${locale}/app/network/messages?conversationId=${result.conversationId}`);
      onOpenChange(false);
      setGroupSelections([]);
      setGroupName("");
      setMode("dm");
    }
  } catch (err) {
    console.error("Failed to create group:", err);
  }
};
```

**Step 4: Wire up `useStartGroupDM`** in the hook section at the top of the component:
```typescript
const { startGroupDM, isStarting: isStartingGroup } = useStartGroupDM();
```

**Step 5: Verify the dialog title** changed from "Start a Direct Message" to "New Message" (since it now handles both modes).

**Step 6: Commit**
```bash
git add app/[locale]/app/\(routes\)/network/messages/components/StartDMDialog.tsx
git commit -m "feat(messages): add Group DM mode to StartDMDialog with multi-select and optional name"
```

---

## Task 11: Add member management to `ConversationSettings`

**Files:**
- Modify: `app/[locale]/app/(routes)/network/messages/components/ConversationSettings.tsx`

**Step 1: Read the full file** before editing.

**Step 2: Add imports at the top**:
```typescript
import { addGroupMember, removeGroupMember } from "@/actions/messaging/group-members";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { Input } from "@/components/ui/input";
import { UserPlus, UserMinus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppToast } from "@/hooks/use-app-toast";
```

**Step 3: Add state inside the `ConversationSettings` component**:
```typescript
const [addMemberSearch, setAddMemberSearch] = useState("");
const [isAdding, setIsAdding] = useState(false);
const [removingId, setRemovingId] = useState<string | null>(null);
const { users: orgUsers } = useOrgUsers();
const { toast } = useAppToast();
```

**Step 4: Add the Members section inside the existing `<div className="space-y-4">` block, after the Info section, but ONLY when `conversation?.isGroup` is true**:

```tsx
{/* Members section — group DMs only */}
{conversation?.isGroup && (
  <div className="space-y-3">
    <Separator />
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users className="h-4 w-4" />
      <span>Members ({conversation.participants?.length ?? 0})</span>
    </div>

    {/* Current participants */}
    <div className="space-y-1 pl-6">
      {conversation.participants?.map((p) => {
        const user = orgUsers?.find((u) => u.id === p.userId);
        return (
          <div key={p.userId} className="flex items-center gap-2 text-sm">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {(user?.name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{user?.name ?? p.userId}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              disabled={removingId === p.userId}
              onClick={async () => {
                setRemovingId(p.userId);
                const result = await removeGroupMember(conversation.id, p.userId);
                setRemovingId(null);
                if (!result.success) {
                  toast({ title: result.error ?? "Could not remove member", variant: "destructive" });
                }
              }}
            >
              <UserMinus className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>

    {/* Add member search */}
    <div className="pl-6 space-y-1">
      <div className="relative">
        <UserPlus className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Add a team member..."
          value={addMemberSearch}
          onChange={(e) => setAddMemberSearch(e.target.value)}
          className="pl-7 h-7 text-sm"
        />
      </div>
      {addMemberSearch.trim() && (() => {
        const currentIds = new Set(conversation.participants?.map((p) => p.userId) ?? []);
        const matches = (orgUsers ?? []).filter(
          (u) =>
            !currentIds.has(u.id) &&
            (u.name?.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
              u.email?.toLowerCase().includes(addMemberSearch.toLowerCase()))
        );
        return matches.length > 0 ? (
          <div className="rounded border bg-popover shadow-sm">
            {matches.slice(0, 5).map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent text-left"
                disabled={isAdding}
                onClick={async () => {
                  setIsAdding(true);
                  const result = await addGroupMember(conversation.id, u.id);
                  setIsAdding(false);
                  setAddMemberSearch("");
                  if (!result.success) {
                    toast({ title: result.error ?? "Could not add member", variant: "destructive" });
                  }
                }}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">{(u.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{u.name ?? u.email}</span>
              </button>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  </div>
)}
```

**Step 5: The `Conversation` type** in `hooks/swr/useMessaging.ts` currently has `participants: Array<{ userId: string }>`. Verify this is enough (it is — we just need `userId` to look up user details from `useOrgUsers`). No type changes needed.

**Step 6: Commit**
```bash
git add app/[locale]/app/\(routes\)/network/messages/components/ConversationSettings.tsx
git commit -m "feat(messages): add member management panel to ConversationSettings for group DMs"
```

---

## Task 12: Final build verification and cleanup check

**Step 1: Check for any remaining audience references**
```bash
grep -r "audience\|Audience" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=prisma/migrations
```
Expected: Zero results (other than this plan file and git history).

**Step 2: Run lint**
```bash
pnpm lint
```
Fix any errors before proceeding.

**Step 3: Run build**
```bash
pnpm build
```
Expected: Build completes with no errors.

**Step 4: Final commit (if any lint/build fixes were needed)**
```bash
git add -A
git commit -m "fix(messages): resolve lint and build issues from audiences removal"
```

**Step 5: Verify manual flow in browser**
1. Navigate to `/app/network/messages`
2. Click the `+` (New Message) button
3. Confirm the dialog now shows "Direct Message" and "Group DM" tabs
4. Switch to "Group DM", select 2+ team members, optionally enter a name, click "Create Group"
5. Confirm the new group conversation appears in the sidebar list and can be chatted in
6. Open the Settings (⚙) icon for the group conversation
7. Confirm the Members section shows with add/remove controls
8. Confirm the Audiences nav item is gone from the sidebar

---

## Summary of Deleted Surface

| Deleted | Path |
|---|---|
| Prisma models | `Audience`, `AudienceMember`, `SharedEntity.audienceId` |
| API routes | `app/api/audiences/**` (4 files) |
| Server actions | `actions/audiences/**`, `actions/messaging/audience-conversations.ts` |
| UI | `app/[locale]/app/(routes)/network/audiences/**` |
| Locales | `locales/{en,el}/audiences.json` |
| Navigation | `config/navigation.tsx` audiences block |

## Summary of Added Surface

| Added | Path |
|---|---|
| Server action | `createGroupConversation` in `actions/messaging/direct-messages.ts` |
| Server actions | `actions/messaging/group-members.ts` (`addGroupMember`, `removeGroupMember`) |
| API route | `app/api/messaging/conversations/group/route.ts` |
| SWR hook | `useStartGroupDM` in `hooks/swr/useMessaging.ts` |
| UI (modified) | `StartDMDialog.tsx` — group mode tab |
| UI (modified) | `ConversationSettings.tsx` — member management panel |
