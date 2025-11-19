import { NextResponse } from 'next/server';
import { prismadb } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/get-current-user';

/**
 * GET /api/crm/tasks/[taskId]
 * Get a single task by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await getCurrentUser();
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
      include: {
        assigned_user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        crm_accounts: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
          },
        },
        calcomEvent: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
        comments: {
          include: {
            assigned_user: {
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
  } catch (error: any) {
    console.error('[GET_TASK]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
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

    // Check if task exists
    const existingTask = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
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
        assigned_user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        crm_accounts: {
          select: {
            id: true,
            client_name: true,
            primary_email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('[UPDATE_TASK]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

