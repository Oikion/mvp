import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { verifyAuthToken } from "@/lib/cron-auth";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

const clerkAdmin = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("cleanup-demo-orgs");

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const staleSettings = await prismadb.organizationSettings.findMany({
      where: { isDemo: true, createdAt: { lt: thirtyDaysAgo } },
      select: { organizationId: true },
    });

    if (staleSettings.length === 0) {
      await completeCronExecution(cronLogId, { purged: 0, total: 0 });
      return NextResponse.json({ purged: 0 });
    }

    const orgIds = staleSettings.map((s) => s.organizationId);
    let purged = 0;

    for (const orgId of orgIds) {
      try {
        await prismadb.$transaction(async (tx) => {
          // Child tables (contactComment, propertyComment, channelMember) cascade
          // automatically via onDelete: Cascade on their parent FK relations.
          // Delete parent tables in any order since they share only organizationId.
          await tx.message.deleteMany({ where: { organizationId: orgId } });
          await tx.channel.deleteMany({ where: { organizationId: orgId } });
          await tx.contact.deleteMany({ where: { organizationId: orgId } });
          await tx.properties.deleteMany({ where: { organizationId: orgId } });
          await tx.request.deleteMany({ where: { organizationId: orgId } });
          await tx.documents.deleteMany({ where: { organizationId: orgId } });
          await tx.organizationSettings.deleteMany({ where: { organizationId: orgId } });
        });

        // Delete Clerk org after DB is clean
        await clerkAdmin.organizations.deleteOrganization(orgId);
        purged++;
      } catch (err) {
        console.error("[CLEANUP_DEMO_ORGS] Failed to purge org", orgId, err);
        // Continue with remaining orgs rather than aborting the batch
      }
    }

    console.log(`[CLEANUP_DEMO_ORGS] Purged ${purged}/${orgIds.length} stale demo orgs`);
    await completeCronExecution(cronLogId, { purged, total: orgIds.length });
    return NextResponse.json({ purged, total: orgIds.length });
  } catch (error) {
    console.error("[CLEANUP_DEMO_ORGS]", error);
    await failCronExecution(cronLogId, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
