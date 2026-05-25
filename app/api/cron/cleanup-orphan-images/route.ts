import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { deleteFromBlob } from "@/lib/vercel-blob";
import { verifyAuthToken } from "@/lib/cron-auth";
import { startCronExecution, completeCronExecution, failCronExecution } from "@/lib/cron-execution";

/**
 * Cron endpoint to clean up orphaned property images.
 *
 * Orphan images are PropertyImage records where:
 *  - propertyId IS NULL (not yet associated with a property)
 *  - createdAt is older than 24 hours
 *
 * Schedule: daily at 03:00 UTC (configured in vercel.json)
 */
export async function GET(req: Request) {
  // Verify cron authorization
  const authHeader = req.headers.get("authorization");
  if (!verifyAuthToken(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronLogId = await startCronExecution("cleanup-orphan-images");

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find orphan images older than 24 hours
    const orphans = await prismadb.propertyImage.findMany({
      where: {
        propertyId: null,
        createdAt: { lt: twentyFourHoursAgo },
      },
      select: {
        id: true,
        url: true,
      },
    });

    let deleted = 0;
    let failed = 0;

    for (const image of orphans) {
      try {
        // Delete from Vercel Blob storage
        await deleteFromBlob(image.url);
      } catch (err) {
        console.error(
          `[CRON_ORPHAN_IMAGES] Failed to delete blob for image ${image.id}:`,
          err
        );
        // Continue with DB deletion even if blob deletion fails —
        // the blob may already be gone or inaccessible
      }

      try {
        // Delete the database record
        await prismadb.propertyImage.delete({
          where: { id: image.id },
        });
        deleted++;
      } catch (err) {
        console.error(
          `[CRON_ORPHAN_IMAGES] Failed to delete DB record for image ${image.id}:`,
          err
        );
        failed++;
      }
    }

    console.log(
      `[CRON_ORPHAN_IMAGES] Cleaned up ${deleted} orphan images, ${failed} failed out of ${orphans.length} found`
    );

    await completeCronExecution(cronLogId, { found: orphans.length, deleted, failed });
    return NextResponse.json({
      success: true,
      found: orphans.length,
      deleted,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to clean up orphan images";
    console.error("[CRON_ORPHAN_IMAGES]", error);
    await failCronExecution(cronLogId, error);
    return NextResponse.json(
      { error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
