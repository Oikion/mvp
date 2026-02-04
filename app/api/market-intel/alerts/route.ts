import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

/**
 * GET /api/market-intel/alerts
 * Get user's market intel alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const alerts = await prismadb.marketIntelAlert.findMany({
      where: {
        userId,
        organizationId: orgId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Alerts GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market-intel/alerts
 * Create a new market intel alert
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, alertType, criteria, emailEnabled, inAppEnabled } = body;

    if (!name || !alertType || !criteria) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate alert type
    const validTypes = [
      'PRICE_DROP',
      'NEW_LISTING',
      'UNDERPRICED',
      'DAYS_ON_MARKET',
      'PRICE_INCREASE',
      'INVENTORY_CHANGE'
    ];

    if (!validTypes.includes(alertType)) {
      return NextResponse.json(
        { error: "Invalid alert type" },
        { status: 400 }
      );
    }

    const alert = await prismadb.marketIntelAlert.create({
      data: {
        userId,
        organizationId: orgId,
        name,
        alertType,
        criteria,
        emailEnabled: emailEnabled ?? true,
        inAppEnabled: inAppEnabled ?? true,
        isActive: true
      }
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Alerts POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/market-intel/alerts
 * Update an existing alert
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Alert ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prismadb.marketIntelAlert.findFirst({
      where: {
        id,
        userId,
        organizationId: orgId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const alert = await prismadb.marketIntelAlert.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Alerts PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/market-intel/alerts
 * Delete an alert
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Alert ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prismadb.marketIntelAlert.findFirst({
      where: {
        id,
        userId,
        organizationId: orgId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    await prismadb.marketIntelAlert.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alerts DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
