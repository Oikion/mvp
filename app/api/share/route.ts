// @ts-nocheck
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { SharedEntityType } from "@prisma/client";
import { shareEntity } from "@/actions/social/sharing";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "received" | "sent" | null;
    const entityType = searchParams.get("entityType") as SharedEntityType | null;

    let whereClause: any = {};

    if (type === "received") {
      whereClause = { sharedWithId: currentUser.id };
    } else if (type === "sent") {
      whereClause = { sharedById: currentUser.id };
    } else {
      whereClause = {
        OR: [{ sharedById: currentUser.id }, { sharedWithId: currentUser.id }],
      };
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    const shares = await prismadb.sharedEntity.findMany({
      where: whereClause,
      include: {
        Users_SharedEntity_sharedByIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        Users_SharedEntity_sharedWithIdToUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to expected field names
    const mappedShares = shares.map((share) => ({
      ...share,
      sharedBy: share.Users_SharedEntity_sharedByIdToUsers,
      sharedWith: share.Users_SharedEntity_sharedWithIdToUsers,
    }));

    return NextResponse.json(mappedShares);
  } catch (error) {
    console.error("[SHARE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityType, entityId, sharedWithId, permissions, message } = body;

    if (!entityType || !entityId || !sharedWithId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const VALID_ENTITY_TYPES: SharedEntityType[] = ["PROPERTY", "CONTACT", "DOCUMENT"];
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return new NextResponse("Invalid entity type", { status: 400 });
    }

    const share = await shareEntity({ entityType, entityId, sharedWithId, permissions, message });
    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("cannot share with yourself")) {
        return new NextResponse(error.message, { status: 400 });
      }
      if (error.message.includes("only share with your connections")) {
        return new NextResponse(error.message, { status: 403 });
      }
      if (error.message.includes("already shared")) {
        return new NextResponse(error.message, { status: 400 });
      }
      if (error.message.includes("not found") || error.message.includes("permission")) {
        return new NextResponse(error.message, { status: 404 });
      }
    }
    console.error("[SHARE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
