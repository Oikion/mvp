# Clerk Custom Roles Configuration

This document outlines the steps to configure custom organization roles in the Clerk Dashboard.

## Overview

The application uses 4 custom organization roles instead of the default Clerk roles:

| Role | Clerk Role Key | Description |
|------|----------------|-------------|
| Owner | `org:owner` | Full access, primary organization administrator |
| Lead | `org:lead` | Full CRUD access on all entities |
| Member | `org:member` | CRUD access, cannot reassign agents |
| Viewer | `org:viewer` | Read-only access on permitted modules |

## Configuration Steps

### 1. Access Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Organization Settings** → **Roles**

### 2. Create Custom Roles

#### Create `org:owner` Role

1. Click **+ Add Role**
2. Set Role name: `Owner`
3. Set Role key: `org:owner`
4. Description: `Full access to all organization features. Primary administrator.`
5. Enable all permissions
6. Click **Create**

#### Create `org:lead` Role

1. Click **+ Add Role**
2. Set Role name: `Lead`
3. Set Role key: `org:lead`
4. Description: `Full access to CRM, MLS, Calendar, and Documents. Cannot manage organization settings.`
5. Enable permissions:
   - `org:sys_memberships:read`
   - `org:sys_memberships:manage` (for inviting members)
6. Click **Create**

#### Update `org:member` Role (if exists) or Create

1. Edit the existing `org:member` role or create new
2. Set Role name: `Member`
3. Set Role key: `org:member`
4. Description: `Standard access to CRM, MLS, Calendar, and Documents. Cannot reassign agents or invite users.`
5. Enable permissions:
   - `org:sys_memberships:read`
6. Click **Save** or **Create**

#### Create `org:viewer` Role

1. Click **+ Add Role**
2. Set Role name: `Viewer`
3. Set Role key: `org:viewer`
4. Description: `Read-only access to permitted modules. Cannot modify data or export.`
5. Enable permissions:
   - `org:sys_memberships:read`
6. Click **Create**

### 3. Set Default Role for New Members

1. Go to **Organization Settings** → **General**
2. Set **Default role for new members** to `org:member`

### 4. Configure Role Hierarchy (Optional)

Clerk doesn't have built-in role hierarchy, but the application implements this in code:

```
org:owner > org:lead > org:member > org:viewer
```

Higher roles can manage users with lower roles.

## Verification

After configuration, verify the roles appear correctly:

1. Go to an organization in your app
2. Navigate to Admin → Users
3. When inviting a new user, all 4 roles should appear in the dropdown

## Troubleshooting

### Roles not appearing in the app

- Ensure the role keys match exactly: `org:owner`, `org:lead`, `org:member`, `org:viewer`
- Clear browser cache and refresh
- Check that the Clerk SDK is updated to the latest version

### Permission denied errors

- Verify the user's role in Clerk Dashboard under Organization → Members
- Check the application logs for specific permission errors

## Related Files

- `lib/permissions/` - Permission checking service
- `lib/org-admin.ts` - Role checking utilities
- `app/[locale]/app/(routes)/admin/roles/` - Role management UI
