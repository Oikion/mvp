// @ts-nocheck
// TODO: Fix type errors
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

interface PlatformProgress {
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

interface JobProgress {
  [platform: string]: PlatformProgress;
}

// Current action tracking for dynamic status display
interface CurrentAction {
  type: "initializing" | "connecting" | "scrolling" | "extracting" | "analyzing" | "saving" | "waiting";
  message: string;
  propertyTitle?: string;
  platform?: string;
  page?: number;
}

/**
 * GET /api/market-intel/scrape/[jobId]
 * 
 * Get the progress of a specific scrape job.
 * Used for polling to show real-time progress updates.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Get the job
    const job = await prismadb.scrapeJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify ownership
    if (job.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const progress = job.progress as JobProgress;

    // Calculate summary statistics
    let totalAnalyzed = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (const platformId of Object.keys(progress)) {
      const p = progress[platformId];
      totalAnalyzed += p.total;
      totalPassed += p.passed;
      totalFailed += p.failed;
      allErrors.push(...p.errors);
    }

    // Calculate elapsed time
    const startedAt = new Date(job.startedAt);
    const now = job.completedAt ? new Date(job.completedAt) : new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Get current action from job data
    const currentAction = job.currentAction as CurrentAction | null;

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      currentPlatform: job.currentPlatform,
      currentAction,
      platforms: job.platforms,
      progress,
      summary: {
        totalAnalyzed,
        totalPassed,
        totalFailed,
        uniqueErrors: [...new Set(allErrors)]
      },
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      elapsedSeconds,
      errorMessage: job.errorMessage
    });

  } catch (error) {
    console.error("Error fetching job progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch job progress" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/market-intel/scrape/[jobId]
 * 
 * Cancel a running scrape job.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Get the job
    const job = await prismadb.scrapeJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify ownership
    if (job.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only cancel pending or running jobs
    if (!["PENDING", "RUNNING"].includes(job.status)) {
      return NextResponse.json({ 
        error: "Cannot cancel a job that is not running" 
      }, { status: 400 });
    }

    // Update job status to cancelled
    await prismadb.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
        errorMessage: "Cancelled by user"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Job cancelled"
    });

  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
