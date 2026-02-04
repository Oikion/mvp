/**
 * Single Job API
 * 
 * GET /api/jobs/[jobId] - Get job status and progress
 * DELETE /api/jobs/[jobId] - Cancel a running job
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getJob,
  cancelJob,
  syncJobStatusFromK8s,
  getJobLogs,
  getK8sClientForEnv,
} from '@/lib/jobs';

export const dynamic = 'force-dynamic';

// ===========================================
// GET /api/jobs/[jobId] - Get job status
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    // Get job from database
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify organization access
    if (job.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Optionally sync status from K8s if job is running
    const syncK8s = request.nextUrl.searchParams.get('sync') === 'true';
    if (syncK8s && ['pending', 'running'].includes(job.status)) {
      await syncJobStatusFromK8s(jobId);
      // Re-fetch after sync
      const updatedJob = await getJob(jobId);
      if (updatedJob) {
        return NextResponse.json({ job: updatedJob });
      }
    }

    // Get K8s status if available
    let k8sStatus = null;
    if (job.k8sJobName) {
      try {
        const k8sClient = getK8sClientForEnv();
        k8sStatus = await k8sClient.getJobStatus(job.k8sJobName);
      } catch {
        // Ignore K8s errors, just don't include status
      }
    }

    return NextResponse.json({
      job,
      k8sStatus,
    });
  } catch (error) {
    console.error('[JOB_GET]', error);
    return NextResponse.json(
      { error: 'Failed to get job' },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE /api/jobs/[jobId] - Cancel job
// ===========================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    // Get job to verify access
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const result = await cancelJob(jobId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[JOB_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
