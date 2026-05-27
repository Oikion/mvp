/**
 * GET /api/export/download/[jobId]
 *
 * Auth-gated download proxy for async bulk exports.
 * Validates ownership and expiry, then redirects to the Vercel Blob URL.
 * Using a redirect (302) avoids double-egress; the blob is served directly
 * from Vercel's CDN after the auth check passes on this server.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import type { BulkExportResult } from "@/lib/export/async-processor";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId: clerkUserId, orgId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { jobId } = await params;

    const job = await prismadb.backgroundJob.findFirst({
      where: {
        id: jobId,
        organizationId: orgId, // tenant isolation
        type: "BULK_EXPORT",
      },
      select: { status: true, result: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Export not ready", status: job.status },
        { status: 409 }
      );
    }

    const result = job.result as BulkExportResult | null;
    if (!result?.downloadUrl) {
      return NextResponse.json({ error: "Download URL missing" }, { status: 500 });
    }

    // Enforce server-side expiry (blob itself is public on Vercel)
    if (new Date(result.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Export link has expired", expiredAt: result.expiresAt },
        { status: 410 }
      );
    }

    return NextResponse.redirect(result.downloadUrl, { status: 302 });
  } catch (error) {
    console.error("[EXPORT_DOWNLOAD_ERROR]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
