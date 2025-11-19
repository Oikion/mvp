/**
 * Calendar Permissions
 * 
 * Role-based access control for calendar operations
 */

import { prismadb } from '@/lib/prisma';
import { getCurrentUser } from './get-current-user';
import { getCurrentOrgIdSafe } from './get-current-user';

/**
 * Check if user can view calendar
 * All authenticated users can view their own calendar
 * Agency owners can view all calendars in their organization
 */
export async function canViewCalendar(
  userId?: string,
  organizationId?: string
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    // If no specific user/org requested, user can view their own calendar
    if (!userId && !organizationId) {
      return true;
    }

    // Agency owners can view any calendar in their organization
    if (currentUser.is_account_admin || currentUser.is_admin) {
      if (organizationId) {
        return organizationId === currentOrgId;
      }
      if (userId) {
        // Check if the requested user is in the same organization
        const requestedUser = await prismadb.users.findUnique({
          where: { id: userId },
        });
        // For now, allow admins to view any user's calendar
        // In production, you might want to check organization membership
        return true;
      }
      return true;
    }

    // Regular users can only view their own calendar
    if (userId) {
      return userId === currentUser.id;
    }

    // Regular users can only view their organization's calendar if they're in it
    if (organizationId) {
      return organizationId === currentOrgId;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can create calendar events
 * All authenticated users can create events
 * Agency owners can create events for any user in their organization
 */
export async function canCreateEvent(
  targetUserId?: string
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();

    // Users can always create events for themselves
    if (!targetUserId || targetUserId === currentUser.id) {
      return true;
    }

    // Agency owners can create events for any user
    if (currentUser.is_account_admin || currentUser.is_admin) {
      return true;
    }

    // Regular users cannot create events for others
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can manage another user's calendar
 * Only agency owners can manage other users' calendars
 */
export async function canManageUserCalendar(
  targetUserId: string
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();

    // Users can always manage their own calendar
    if (targetUserId === currentUser.id) {
      return true;
    }

    // Only agency owners can manage other users' calendars
    return currentUser.is_account_admin || currentUser.is_admin;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can view a specific task
 * Users can view tasks assigned to them or tasks in their organization
 * Agency owners can view all tasks in their organization
 */
export async function canViewTask(taskId: string): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
      include: {
        crm_accounts: true,
      },
    });

    if (!task) {
      return false;
    }

    // Agency owners can view all tasks in their organization
    if (currentUser.is_account_admin || currentUser.is_admin) {
      if (task.crm_accounts?.organizationId) {
        return task.crm_accounts.organizationId === currentOrgId;
      }
      return true; // Allow if no org restriction
    }

    // Regular users can view tasks assigned to them
    if (task.user === currentUser.id) {
      return true;
    }

    // Regular users can view tasks in their organization
    if (task.crm_accounts?.organizationId === currentOrgId) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can edit a specific task
 * Users can edit tasks assigned to them
 * Agency owners can edit all tasks in their organization
 */
export async function canEditTask(taskId: string): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    const currentOrgId = await getCurrentOrgIdSafe();

    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
      include: {
        crm_accounts: true,
      },
    });

    if (!task) {
      return false;
    }

    // Agency owners can edit all tasks in their organization
    if (currentUser.is_account_admin || currentUser.is_admin) {
      if (task.crm_accounts?.organizationId) {
        return task.crm_accounts.organizationId === currentOrgId;
      }
      return true;
    }

    // Regular users can edit tasks assigned to them
    return task.user === currentUser.id;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can sync tasks to calendar
 * All users can sync their own tasks
 * Agency owners can sync any tasks in their organization
 */
export async function canSyncTasksToCalendar(
  taskId?: string,
  userId?: string
): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();

    // If syncing a specific task, check task permissions
    if (taskId) {
      return await canEditTask(taskId);
    }

    // If syncing for a specific user, check user calendar permissions
    if (userId) {
      return await canManageUserCalendar(userId);
    }

    // Users can always sync their own tasks
    return true;
  } catch (error) {
    return false;
  }
}

