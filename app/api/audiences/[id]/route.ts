import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/audiences/[id]
 * Get a single audience by ID
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const audience = await prismadb.audience.findFirst({
      where: {
        id,
        OR: [
          { createdById: currentUser.id, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
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
        AudienceMember: {
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
          orderBy: { addedAt: "desc" },
        },
        _count: {
          select: { AudienceMember: true },
        },
      },
    });

    if (!audience) {
      return new NextResponse("Audience not found", { status: 404 });
    }

    return NextResponse.json({
      id: audience.id,
      name: audience.name,
      description: audience.description,
      organizationId: audience.organizationId,
      isAutoSync: audience.isAutoSync,
      createdAt: audience.createdAt,
      updatedAt: audience.updatedAt,
      createdById: audience.createdById,
      createdBy: audience.Users,
      memberCount: audience._count.AudienceMember,
      members: audience.AudienceMember.map(m => ({ ...m, user: m.Users })),
    });
  } catch (error) {
    console.error("Error fetching audience:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * PUT /api/audiences/[id]
 * Update an audience
 */
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if user has access
    const audience = await prismadb.audience.findFirst({
      where: {
        id,
        OR: [
          { createdById: currentUser.id, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return new NextResponse("Audience not found or no permission", { status: 404 });
    }

    const body = await req.json();
    const { name, description, isAutoSync } = body;

    // Build update data
    const updateData: any = {};
    if (name !== undefined && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (isAutoSync !== undefined && audience.organizationId) {
      updateData.isAutoSync = !!isAutoSync;
    }

    const updated = await prismadb.audience.update({
      where: { id },
      data: updateData,
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        AudienceMember: {
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
        },
        _count: {
          select: { AudienceMember: true },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      createdBy: updated.Users,
      memberCount: updated._count.AudienceMember,
      members: updated.AudienceMember.map(m => ({ ...m, user: m.Users })),
    });
  } catch (error) {
    console.error("Error updating audience:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/audiences/[id]
 * Delete an audience
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Check if user has access
    const audience = await prismadb.audience.findFirst({
      where: {
        id,
        OR: [
          { createdById: currentUser.id, organizationId: null },
          ...(organizationId ? [{ organizationId }] : []),
        ],
      },
    });

    if (!audience) {
      return new NextResponse("Audience not found or no permission", { status: 404 });
    }

    await prismadb.audience.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting audience:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}














