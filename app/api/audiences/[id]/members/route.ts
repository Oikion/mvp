import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

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

    const body = await req.json();
    const { memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return new NextResponse("memberIds array is required", { status: 400 });
    }

    // Add members
    await prismadb.audienceMember.createMany({
      data: memberIds.map((userId: string) => ({
        audienceId: id,
        userId,
      })),
      skipDuplicates: true,
    });

    // Fetch updated audience
    const updated = await prismadb.audience.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
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
          select: { members: true },
        },
      },
    });

    return NextResponse.json(updated);
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
        members: {
          include: {
            user: {
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
          select: { members: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error removing audience members:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}








