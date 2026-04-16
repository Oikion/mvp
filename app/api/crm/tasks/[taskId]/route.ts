// @ts-nocheck
import { NextResponse } from 'next/server';
import { prismadb } from '@/lib/prisma';
import { getCurrentUser, getCurrentOrgIdSafe } from '@/lib/get-current-user';
import { canPerformAction } from '@/lib/permissions/action-service';

/**
 * GET /api/crm/tasks/[taskId]
 * Get a single task by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Permission check: Users need task:read permission
    const readCheck = await canPerformAction("task:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: readCheck.reason }, { status: 403 });
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: { id: taskId, organizationId },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        Clients: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
          },
        },
        CalendarEvent: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
        crm_Accounts_Tasks_Comments: {
          include: {
            Users: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error: unknown) {
    console.error('[GET_TASK]', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/tasks/[taskId]
 * Update a task
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { taskId } = await params;
    const body = await req.json();

    const {
      title,
      content,
      priority,
      dueDateAt,
      user: assignedUser,
      account,
      taskStatus,
    } = body;

    // Check if task exists within the organization
    const existingTask = await prismadb.crm_Accounts_Tasks.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Permission check: Users need task:update permission with ownership check
    const updateCheck = await canPerformAction("task:update", {
      entityType: "task",
      entityId: taskId,
      ownerId: existingTask.user,
    });
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason }, { status: 403 });
    }

    // Check if user is trying to assign to someone else
    if (assignedUser && assignedUser !== existingTask.user) {
      const assignCheck = await canPerformAction("task:assign");
      if (!assignCheck.allowed) {
        return NextResponse.json({ error: "You don't have permission to assign tasks to others" }, { status: 403 });
      }
    }

    // Update task
    const updatedTask = await prismadb.crm_Accounts_Tasks.update({
      where: { id: taskId },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(priority && { priority }),
        ...(dueDateAt && { dueDateAt: new Date(dueDateAt) }),
        ...(assignedUser && { user: assignedUser }),
        ...(account !== undefined && { account }),
        ...(taskStatus && { taskStatus }),
        updatedBy: currentUser.id,
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        Clients: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedTask,
      assigned_user: updatedTask.Users,
      crm_accounts: updatedTask.Clients,
    });
  } catch (error: unknown) {
    console.error('[UPDATE_TASK]', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

