import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";

/**
 * POST /api/audiences/[id]/sync
 * Sync org members to an auto-sync audience
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const organizationId = await getCurrentOrgId();

    // Verify audience exists and is org-level with auto-sync
    const audience = await prismadb.audience.findFirst({
      where: {
        id,
        organizationId,
        isAutoSync: true,
      },
    });

    if (!audience) {
      return new NextResponse(
        "Audience not found, not an org audience, or auto-sync is disabled",
        { status: 404 }
      );
    }

    // Get all org members
    const { users: orgMembers } = await getOrgMembersFromDb();
    const orgMemberIds = orgMembers.map((u: any) => u.id);

    // Get current audience members
    const currentMembers = await prismadb.audienceMember.findMany({
      where: { audienceId: id },
      select: { userId: true },
    });
    const currentMemberIds = new Set(currentMembers.map((m) => m.userId));

    // Find members to add
    const membersToAdd = orgMemberIds.filter((uid: string) => !currentMemberIds.has(uid));

    if (membersToAdd.length > 0) {
      await prismadb.audienceMember.createMany({
        data: membersToAdd.map((userId: string) => ({
          audienceId: id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

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

    return NextResponse.json({
      ...updated,
      addedCount: membersToAdd.length,
    });
  } catch (error) {
    console.error("Error syncing org audience:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

