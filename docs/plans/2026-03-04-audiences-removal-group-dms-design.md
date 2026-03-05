# Design: Remove Audiences, Integrate Group DMs into Messages

**Date:** 2026-03-04
**Branch:** feat/property-location-model (will be implemented on a new branch)
**Status:** Approved

## Summary

Delete the Audiences feature entirely and integrate Group DM creation natively into the Messages feature. The `Conversation` model already supports group chats (`isGroup`, `name`) — the work is UI and cleanup.

## Decisions

| Question | Decision |
|---|---|
| Group name | Optional (auto-generated fallback from first 3 participant names) |
| Participants | Team members in same org only |
| Member management after creation | Yes — add & remove |
| Database | Drop Audience + AudienceMember tables via Prisma migration |

## 1. Database Changes

### Remove
- `Audience` model
- `AudienceMember` model
- `audienceId` field on `SharedEntity`
- `Audience` and `AudienceMember` relations on `Users`

### No changes needed for Group DMs
`Conversation` already has:
- `isGroup Boolean @default(false)`
- `name String?`
- `participants ConversationParticipant[]`

### New server actions needed
- `createGroupConversation(participantIds: string[], name?: string)` — in `actions/messaging/direct-messages.ts`
- `addGroupMember(conversationId: string, userId: string)` — new file or same
- `removeGroupMember(conversationId: string, userId: string)` — new file or same

All use existing permission check `messaging:create_dm` and scope by `organizationId`.

## 2. Audiences Removal Surface

### Delete entirely
- `app/api/audiences/route.ts`
- `app/api/audiences/[id]/route.ts`
- `app/api/audiences/[id]/members/route.ts`
- `app/api/audiences/[id]/sync/route.ts`
- `actions/audiences/` (all files)
- `actions/messaging/audience-conversations.ts`
- `app/[locale]/app/(routes)/network/audiences/` (page + all components)
- Audience locale files (`locales/{en,el}/audiences.json` if present)

### Modify
- `AppSidebar.tsx` — remove "Audiences" nav item and the `"audiences"` module gate
- `lib/permissions/` or dashboard config — remove `"audiences"` module references

## 3. `StartDMDialog` — Group DM Mode

Add a tab row at the top of the dialog:

```
[ Direct Message ] [ Group DM ]
```

**Group DM tab behaviour:**
- Multi-select user list (org members via `useOrgUsers`, excluding self)
- Selected members shown as dismissible avatar chips below search
- Optional group name input (placeholder shows auto-generated name, e.g. "Nikos, Maria, Yiannis")
- Submit button: "Create Group" — disabled until ≥ 2 members selected
- On submit: calls `createGroupConversation(participantIds, name?)`
- On success: navigate to `?conversationId=<id>` and close dialog

**Direct Message tab:** unchanged from current implementation.

## 4. `ConversationSettings` — Member Management for Groups

When `conversation.isGroup === true`, add a **Members** section:

- List current participants (avatar + name)
- "Add member" — inline search of org users not already in group; calls `addGroupMember`
- "Remove" button per member (disabled for self and creator)
- Existing "Leave conversation" remains

Server-side guards:
- Only org members (`organizationId` scoping)
- Cannot remove the group creator
- Cannot remove yourself (use leave instead)

## 5. `MessagesPage` / `ConversationList`

No changes needed:
- Groups already appear in the "Internal" tab (same `Conversation` model)
- `ConversationItem.type: "group"` already renders a `Users` icon in `ConversationList`
- The `+` button label stays "New Message" — the tab inside handles DM vs Group

## 6. i18n

- Add group DM strings to `locales/{en,el}/messages.json`:
  - Tab labels: "Direct Message", "Group DM"
  - Placeholder: "Group name (optional)"
  - "Create Group", "Add member", "Remove member"
- Remove audience locale files

## File Change Summary

| Action | Target |
|---|---|
| **Delete** | `app/api/audiences/**` (4 files) |
| **Delete** | `actions/audiences/**` |
| **Delete** | `actions/messaging/audience-conversations.ts` |
| **Delete** | `app/[locale]/app/(routes)/network/audiences/**` |
| **Delete** | `locales/{en,el}/audiences.json` (if present) |
| **Modify** | `prisma/schema.prisma` — remove Audience, AudienceMember, audienceId on SharedEntity |
| **New** | Prisma migration dropping Audience tables |
| **Modify** | `actions/messaging/direct-messages.ts` — add `createGroupConversation` |
| **New** | `actions/messaging/group-members.ts` — `addGroupMember`, `removeGroupMember` |
| **Modify** | `app/[locale]/app/(routes)/network/messages/components/StartDMDialog.tsx` |
| **Modify** | `app/[locale]/app/(routes)/network/messages/components/ConversationSettings.tsx` |
| **Modify** | `app/[locale]/app/(routes)/components/AppSidebar.tsx` |
| **Modify** | `locales/{en,el}/messages.json` — add group DM strings |
| **Modify** | Any permissions/module-config referencing `"audiences"` module |
