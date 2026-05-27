/**
 * GET /api/export/status/[jobId]
 *
 * Polls the status of an async bulk export job.
 * Returns { status, downloadUrl?, expiresAt?, filename?, rowCount?, errorMessage? }
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
      select: {
        status: true,
        result: true,
        errorMessage: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        progress: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const result = job.result as BulkExportResult | null;

    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      // downloadUrl is intentionally omitted — clients must use /api/export/download/[jobId]
      // which enforces auth + org-scope + expiry before redirecting to the blob URL
      expiresAt: result?.expiresAt ?? null,
      filename: result?.filename ?? null,
      rowCount: result?.rowCount ?? null,
      // Sanitized message only — full error is logged server-side
      errorMessage: job.status === "FAILED" ? "Export processing failed. Please try again." : null,
    });
  } catch (error) {
    console.error("[EXPORT_STATUS_ERROR]", error);
    return NextResponse.json({ error: "Failed to get export status" }, { status: 500 });
  }
}
