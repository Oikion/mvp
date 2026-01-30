import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { canPerformAction } from "@/lib/permissions/action-service";

/**
 * POST /api/audiences/[id]/members
 * Add members to an audience
 */
export async function POST(
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

    // Permission check: Users need audience:update permission with ownership check
    const updateCheck = await canPerformAction("audience:update", {
      entityType: "audience" as any,
      entityId: id,
      ownerId: audience.createdById,
    });
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason }, { status: 403 });
    }

    const body = await req.json();
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return new NextResponse("memberIds array is required", { status: 400 });
    }

    // Add members
    await prismadb.audienceMember.createMany({
      data: memberIds.map((userId: string) => ({
        id: crypto.randomUUID(),
        audienceId: id,
        userId,
      })),
      skipDuplicates: true,
    });

    // Fetch updated audience
    const updated = await prismadb.audience.findUnique({
      where: { id },
      include: {
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

    if (!updated) {
      return new NextResponse("Audience not found", { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      memberCount: updated._count.AudienceMember,
      members: updated.AudienceMember.map(m => ({ ...m, user: m.Users })),
    });
  } catch (error) {
    console.error("Error adding audience members:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/audiences/[id]/members
 * Remove members from an audience
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

    // Permission check: Users need audience:update permission with ownership check
    const updateCheck = await canPerformAction("audience:update", {
      entityType: "audience" as any,
      entityId: id,
      ownerId: audience.createdById,
    });
    if (!updateCheck.allowed) {
      return NextResponse.json({ error: updateCheck.reason }, { status: 403 });
    }

    const body = await req.json();
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return new NextResponse("memberIds array is required", { status: 400 });
    }

    // Remove members
    await prismadb.audienceMember.deleteMany({
      where: {
        audienceId: id,
        userId: { in: memberIds },
      },
    });

    // Fetch updated audience
    const updated = await prismadb.audience.findUnique({
      where: { id },
      include: {
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

    if (!updated) {
      return new NextResponse("Audience not found", { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      memberCount: updated._count.AudienceMember,
      members: updated.AudienceMember.map(m => ({ ...m, user: m.Users })),
    });
  } catch (error) {
    console.error("Error removing audience members:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}














