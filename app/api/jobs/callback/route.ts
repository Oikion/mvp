/**
 * Job Callback API
 * 
 * POST /api/jobs/callback - Worker callback for progress/completion updates
 * 
 * This endpoint is called by K8s workers to report job progress
 * and completion status. It requires a shared secret for authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateJobProgress, completeJob, getJob } from '@/lib/jobs';
import type { JobProgressUpdate, JobCompletionUpdate, JobResult } from '@/lib/jobs';

export const dynamic = 'force-dynamic';

// Shared secret for worker authentication
const WORKER_SECRET = process.env.WORKER_CALLBACK_SECRET || process.env.CRON_SECRET;

/**
 * Verify worker authentication
 */
function verifyWorkerAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !WORKER_SECRET) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === WORKER_SECRET;
}

// ===========================================
// POST /api/jobs/callback - Worker callback
// ===========================================

export async function POST(request: NextRequest) {
  try {
    // Verify worker authentication
    if (!verifyWorkerAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { event, jobId, data } = body;

    if (!event || !jobId) {
      return NextResponse.json(
        { error: 'Missing required fields: event, jobId' },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    switch (event) {
      case 'job.started': {
        // Job started - could update startedAt if not already set
        console.log(`[JobCallback] Job ${jobId} started`);
        break;
      }

      case 'job.progress': {
        const progress = data?.progress;
        const message = data?.message;

        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
          return NextResponse.json(
            { error: 'Invalid progress value (must be 0-100)' },
            { status: 400 }
          );
        }

        await updateJobProgress({
          jobId,
          progress,
          message,
          metadata: data?.metadata,
        });

        console.log(`[JobCallback] Job ${jobId} progress: ${progress}%`);
        break;
      }

      case 'job.completed': {
        const result = data?.result as JobResult | undefined;

        await completeJob({
          jobId,
          status: 'completed',
          result,
        });

        console.log(`[JobCallback] Job ${jobId} completed`);
        break;
      }

      case 'job.failed': {
        const errorMessage = data?.errorMessage || 'Unknown error';
        const result = data?.result as JobResult | undefined;

        await completeJob({
          jobId,
          status: 'failed',
          result,
          errorMessage,
        });

        console.log(`[JobCallback] Job ${jobId} failed: ${errorMessage}`);
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[JOB_CALLBACK]', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
