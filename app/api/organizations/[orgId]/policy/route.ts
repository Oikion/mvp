import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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

    // Verify the requesting user is a member of the target org.
    // Without this check any authenticated user can read any org's policy.
    try {
      const clerk = await clerkClient();
      const memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 500,
      });
      const isMember = memberships.data.some(
        (m) => m.publicUserData?.userId === userId
      );
      if (!isMember) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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
