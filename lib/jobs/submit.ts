/**
 * Job Submission Service
 * 
 * Handles the submission of background jobs to Kubernetes,
 * manages job lifecycle, and provides progress tracking.
 */

import { prismadb } from '@/lib/prisma';
import { getK8sClientForEnv, K8sClient } from './k8s-client';
import type {
  JobType,
  JobPayload,
  JobSubmission,
  JobRecord,
  JobStatus,
  JobResult,
  JobProgressUpdate,
  JobCompletionUpdate,
  JobSubmissionResponse,
} from './types';

// ===========================================
// Type Mapping
// ===========================================

const JOB_TYPE_TO_PRISMA: Record<JobType, 'MARKET_INTEL_SCRAPE' | 'NEWSLETTER_SEND' | 'PORTAL_PUBLISH_XE' | 'BULK_EXPORT'> = {
  'market-intel-scrape': 'MARKET_INTEL_SCRAPE',
  'newsletter-send': 'NEWSLETTER_SEND',
  'portal-publish-xe': 'PORTAL_PUBLISH_XE',
  'bulk-export': 'BULK_EXPORT',
};

const PRISMA_TO_JOB_TYPE: Record<string, JobType> = {
  'MARKET_INTEL_SCRAPE': 'market-intel-scrape',
  'NEWSLETTER_SEND': 'newsletter-send',
  'PORTAL_PUBLISH_XE': 'portal-publish-xe',
  'BULK_EXPORT': 'bulk-export',
};

const JOB_STATUS_TO_PRISMA: Record<JobStatus, 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'> = {
  'pending': 'PENDING',
  'running': 'RUNNING',
  'completed': 'COMPLETED',
  'failed': 'FAILED',
  'cancelled': 'CANCELLED',
};

const PRISMA_TO_JOB_STATUS: Record<string, JobStatus> = {
  'PENDING': 'pending',
  'RUNNING': 'running',
  'COMPLETED': 'completed',
  'FAILED': 'failed',
  'CANCELLED': 'cancelled',
};

// ===========================================
// Job Submission
// ===========================================

export interface SubmitJobOptions extends JobSubmission {
  createdBy?: string;
  callbackUrl?: string;
}

export async function submitJob(options: SubmitJobOptions): Promise<JobSubmissionResponse> {
  const {
    type,
    organizationId,
    payload,
    priority = 'normal',
    metadata,
    createdBy,
    callbackUrl,
  } = options;

  try {
    // Check for existing running job of same type for this org
    const existingJob = await prismadb.backgroundJob.findFirst({
      where: {
        organizationId,
        type: JOB_TYPE_TO_PRISMA[type],
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (existingJob) {
      return {
        success: false,
        jobId: existingJob.id,
        status: PRISMA_TO_JOB_STATUS[existingJob.status],
        message: `A ${type} job is already running for this organization`,
      };
    }

    // Create job record in database
    const job = await prismadb.backgroundJob.create({
      data: {
        type: JOB_TYPE_TO_PRISMA[type],
        organizationId,
        status: 'PENDING',
        progress: 0,
        payload: payload as any,
        createdBy,
        priority: priority.toUpperCase() as 'LOW' | 'NORMAL' | 'HIGH',
      },
    });

    // Get K8s client and create the job
    const k8sClient = getK8sClientForEnv();
    
    try {
      const { jobName } = await k8sClient.createJob({
        jobId: job.id,
        type,
        organizationId,
        payload,
        callbackUrl,
      });

      // Update with K8s job name
      await prismadb.backgroundJob.update({
        where: { id: job.id },
        data: {
          k8sJobName: jobName,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      return {
        success: true,
        jobId: job.id,
        status: 'running',
        message: `Job ${jobName} created successfully`,
      };
    } catch (k8sError) {
      // K8s creation failed, mark job as failed
      await prismadb.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: k8sError instanceof Error ? k8sError.message : 'Failed to create K8s job',
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        jobId: job.id,
        status: 'failed',
        message: k8sError instanceof Error ? k8sError.message : 'Failed to create K8s job',
      };
    }
  } catch (error) {
    console.error('[submitJob] Error:', error);
    throw error;
  }
}

// ===========================================
// Job Status Operations
// ===========================================

export async function getJob(jobId: string): Promise<JobRecord | null> {
  const job = await prismadb.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return null;

  return {
    id: job.id,
    type: PRISMA_TO_JOB_TYPE[job.type] as JobType,
    organizationId: job.organizationId,
    status: PRISMA_TO_JOB_STATUS[job.status] as JobStatus,
    progress: job.progress,
    progressMessage: job.progressMessage || undefined,
    k8sJobName: job.k8sJobName || undefined,
    k8sPodName: job.k8sPodName || undefined,
    payload: job.payload as JobPayload,
    result: job.result as JobResult | undefined,
    errorMessage: job.errorMessage || undefined,
    createdAt: job.createdAt,
    startedAt: job.startedAt || undefined,
    completedAt: job.completedAt || undefined,
    createdBy: job.createdBy || undefined,
  };
}

export async function getJobsByOrganization(
  organizationId: string,
  options?: {
    type?: JobType;
    status?: JobStatus[];
    limit?: number;
    offset?: number;
  }
): Promise<{ jobs: JobRecord[]; total: number }> {
  const where: any = { organizationId };

  if (options?.type) {
    where.type = JOB_TYPE_TO_PRISMA[options.type];
  }

  if (options?.status && options.status.length > 0) {
    where.status = { in: options.status.map(s => JOB_STATUS_TO_PRISMA[s]) };
  }

  const [jobs, total] = await Promise.all([
    prismadb.backgroundJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prismadb.backgroundJob.count({ where }),
  ]);

  return {
    jobs: jobs.map(job => ({
      id: job.id,
      type: PRISMA_TO_JOB_TYPE[job.type] as JobType,
      organizationId: job.organizationId,
      status: PRISMA_TO_JOB_STATUS[job.status] as JobStatus,
      progress: job.progress,
      progressMessage: job.progressMessage || undefined,
      k8sJobName: job.k8sJobName || undefined,
      k8sPodName: job.k8sPodName || undefined,
      payload: job.payload as JobPayload,
      result: job.result as JobResult | undefined,
      errorMessage: job.errorMessage || undefined,
      createdAt: job.createdAt,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdBy: job.createdBy || undefined,
    })),
    total,
  };
}

// ===========================================
// Job Progress Updates
// ===========================================

export async function updateJobProgress(update: JobProgressUpdate): Promise<void> {
  await prismadb.backgroundJob.update({
    where: { id: update.jobId },
    data: {
      progress: Math.min(100, Math.max(0, update.progress)),
      progressMessage: update.message,
    },
  });
}

export async function completeJob(update: JobCompletionUpdate): Promise<void> {
  await prismadb.backgroundJob.update({
    where: { id: update.jobId },
    data: {
      status: update.status === 'completed' ? 'COMPLETED' : 'FAILED',
      progress: update.status === 'completed' ? 100 : undefined,
      result: update.result as any,
      errorMessage: update.errorMessage,
      completedAt: new Date(),
    },
  });
}

// ===========================================
// Job Cancellation
// ===========================================

export async function cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const job = await prismadb.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { success: false, message: 'Job not found' };
  }

  if (!['PENDING', 'RUNNING'].includes(job.status)) {
    return { success: false, message: 'Job is not cancellable' };
  }

  // Delete K8s job if it exists
  if (job.k8sJobName) {
    try {
      const k8sClient = getK8sClientForEnv();
      await k8sClient.deleteJob(job.k8sJobName);
    } catch (error) {
      console.error('[cancelJob] Failed to delete K8s job:', error);
      // Continue with database update even if K8s deletion fails
    }
  }

  await prismadb.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  return { success: true, message: 'Job cancelled successfully' };
}

// ===========================================
// Job Cleanup
// ===========================================

export async function cleanupOldJobs(daysOld: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prismadb.backgroundJob.deleteMany({
    where: {
      status: { in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
      completedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// ===========================================
// Job Sync with K8s
// ===========================================

export async function syncJobStatusFromK8s(jobId: string): Promise<void> {
  const job = await prismadb.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.k8sJobName) return;
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) return;

  const k8sClient = getK8sClientForEnv();
  const { complete, succeeded } = await k8sClient.isJobComplete(job.k8sJobName);

  if (complete) {
    await prismadb.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: succeeded ? 'COMPLETED' : 'FAILED',
        progress: succeeded ? 100 : job.progress,
        completedAt: new Date(),
      },
    });
  }
}

// ===========================================
// Job Logs
// ===========================================

export async function getJobLogs(jobId: string, tailLines?: number): Promise<string | null> {
  const job = await prismadb.backgroundJob.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.k8sJobName) return null;

  try {
    const k8sClient = getK8sClientForEnv();
    return await k8sClient.getJobLogs(job.k8sJobName, tailLines);
  } catch {
    return null;
  }
}
