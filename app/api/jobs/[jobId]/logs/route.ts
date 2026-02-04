/**
 * Job Logs API
 * 
 * GET /api/jobs/[jobId]/logs - Get logs from K8s pod
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getJob, getJobLogs } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

// ===========================================
// GET /api/jobs/[jobId]/logs - Get job logs
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

    if (!job.k8sJobName) {
      return NextResponse.json(
        { error: 'Job has no associated K8s job' },
        { status: 400 }
      );
    }

    // Get tail lines from query param
    const tailLines = parseInt(
      request.nextUrl.searchParams.get('tail') || '100',
      10
    );

    const logs = await getJobLogs(jobId, tailLines);

    if (logs === null) {
      return NextResponse.json(
        { error: 'Failed to retrieve logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobId,
      k8sJobName: job.k8sJobName,
      logs,
    });
  } catch (error) {
    console.error('[JOB_LOGS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to get logs' },
      { status: 500 }
    );
  }
}
