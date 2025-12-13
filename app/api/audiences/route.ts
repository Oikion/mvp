import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/audiences
 * List all audiences accessible to the current user
 */
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "personal" | "org" | null (all)

    const whereClause: any = {
      OR: [],
    };

    if (type === "personal" || !type) {
      whereClause.OR.push({ createdById: currentUser.id, organizationId: null });
    }
    if ((type === "org" || !type) && organizationId) {
      whereClause.OR.push({ organizationId });
    }

    const audiences = await prismadb.audience.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
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
      orderBy: { createdAt: "desc" },
    });

    const result = audiences.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      organizationId: a.organizationId,
      isAutoSync: a.isAutoSync,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      createdById: a.createdById,
      createdBy: a.createdBy,
      memberCount: a._count.members,
      members: a.members,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching audiences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/audiences
 * Create a new audience
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    const body = await req.json();
    const { name, description, isOrgLevel, isAutoSync, memberIds } = body;

    if (!name || name.trim().length === 0) {
      return new NextResponse("Audience name is required", { status: 400 });
    }

    // Create the audience
    const audience = await prismadb.audience.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        createdById: currentUser.id,
        organizationId: isOrgLevel ? organizationId : null,
        isAutoSync: isOrgLevel ? !!isAutoSync : false,
      },
    });

    // Add initial members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      await prismadb.audienceMember.createMany({
        data: memberIds.map((userId: string) => ({
          audienceId: audience.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch complete audience with members
    const result = await prismadb.audience.findUnique({
      where: { id: audience.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
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
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating audience:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}






