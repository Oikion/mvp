# Clerk Migration - Remaining API Routes

## Files Still Needing Updates (30 files)

The following files still need to be updated from NextAuth to Clerk:

1. `app/api/admin/deleteModule/[moduleId]/route.ts`
2. `app/api/admin/activateModule/[moduleId]/route.ts`
3. `app/api/admin/deactivateModule/[moduleId]/route.ts`
4. `app/api/crm/client-contacts/route.ts`
5. `app/api/crm/clients/route.ts`
6. `app/api/crm/account/[accountId]/route.ts`
7. `app/api/crm/account/[accountId]/unwatch/route.ts`
8. `app/api/crm/account/[accountId]/watch/route.ts`
9. `app/api/crm/account/[accountId]/task/create/route.ts`
10. `app/api/crm/account/route.ts`
11. `app/api/crm/contacts/route.ts`
12. `app/api/crm/contacts/[contactId]/route.ts`
13. `app/api/crm/tasks/route.ts`
14. `app/api/crm/tasks/addCommentToTask/[taskId]/route.ts`
15. `app/api/digitalocean/list-buckets/route.ts`
16. `app/api/digitalocean/list-file-in-bucket/[bucketId]/route.ts`
17. `app/api/feedback/route.ts`
18. `app/api/mls/properties/route.ts`
19. `app/api/my-account/route.ts`
20. `app/api/openai/completion/route.ts`
21. `app/api/profile/updateProfilePhoto/route.ts`
22. `app/api/projects/sections/[boardId]/route.ts`
23. `app/api/projects/sections/delete-section/[sectionId]/route.ts`
24. `app/api/projects/sections/update-title/[sectionId]/route.ts`
25. `app/api/projects/tasks/addCommentToTask/[taskId]/route.ts`
26. `app/api/projects/tasks/mark-task-as-done/[taskId]/route.ts`
27. `app/api/projects/tasks/update-kanban-position/route.ts`
28. `app/api/projects/tasks/update-task/[taskId]/route.ts`
29. `app/api/temp/route.ts`

## Migration Pattern

For each file, follow this pattern:

### 1. Update Imports
**Remove:**
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
```

**Add:**
```typescript
import { getCurrentUser } from "@/lib/get-current-user";
```

### 2. Replace Session Access
**Replace:**
```typescript
const session = await getServerSession(authOptions);

if (!session) {
  return new NextResponse("Unauthenticated", { status: 401 });
}
```

**With:**
```typescript
try {
  const user = await getCurrentUser();
  // ... rest of your code
} catch (error) {
  // getCurrentUser throws if not authenticated, so handle in catch block
  return new NextResponse("Unauthenticated", { status: 401 });
}
```

**Or simpler (if you don't need the user object):**
```typescript
try {
  await getCurrentUser();
  // ... rest of your code
} catch (error) {
  return new NextResponse("Unauthenticated", { status: 401 });
}
```

### 3. Replace User References
**Replace:**
- `session.user.id` → `user.id`
- `session.user.isAdmin` → `user.is_admin`
- `session.user.name` → `user.name`
- `session.user.email` → `user.email`
- `session.user.userLanguage` → `user.userLanguage`

### 4. Example Transformation

**Before:**
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
  
  // Use session.user.id
  await doSomething(session.user.id);
}
```

**After:**
```typescript
import { getCurrentUser } from "@/lib/get-current-user";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    
    // Use user.id
    await doSomething(user.id);
  } catch (error) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }
}
```

## Notes

- `getCurrentUser()` throws an error if the user is not authenticated, so wrap it in try/catch
- All user properties remain the same except `isAdmin` → `is_admin` (database field name)
- The user object comes from your Prisma Users table, not directly from Clerk
- Clerk user ID is stored in `clerkUserId` field, but you typically use the Prisma user `id` field

