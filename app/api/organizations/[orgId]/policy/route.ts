import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orgId } = await params;

    const settings = await prismadb.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: {
        dataOwnershipMode: true,
        dataOwnershipSetAt: true,
        policyVersion: true,
      },
    });

    if (!settings?.dataOwnershipSetAt) {
      return NextResponse.json({
        mode: "AGENCY",
        policyVersion: 0,
        policyNotSet: true,
      });
    }

    return NextResponse.json({
      mode: settings.dataOwnershipMode,
      policyVersion: settings.policyVersion,
      policyNotSet: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch organization policy" },
      { status: 500 }
    );
  }
}
