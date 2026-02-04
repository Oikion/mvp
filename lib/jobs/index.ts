/**
 * Job Orchestration Module
 * 
 * Unified interface for managing background jobs via Kubernetes.
 */

// Export types only (not constants/objects to avoid "use server" issues)
export type {
  JobType,
  JobStatus,
  JobPriority,
  JobSubmission,
  JobPayload,
  MarketIntelPayload,
  NewsletterPayload,
  PortalPublishPayload,
  BulkExportPayload,
  JobRecord,
  JobResult,
  MarketIntelResult,
  NewsletterResult,
  PortalPublishResult,
  BulkExportResult,
  K8sJobSpec,
  K8sEnvVar,
  K8sResourceRequirements,
  K8sJobStatus,
  K8sJobCondition,
  JobTypeConfig,
  JobProgressUpdate,
  JobCompletionUpdate,
  JobSubmissionResponse,
  JobStatusResponse,
  JobListResponse,
  JobWebhookPayload,
} from './types';

// Export K8s client
export {
  K8sClient,
  MockK8sClient,
  getK8sClient,
  getK8sClientForEnv,
  generateJobName,
  buildJobManifest,
} from './k8s-client';

// Export submission utilities
export {
  submitJob,
  getJob,
  getJobsByOrganization,
  updateJobProgress,
  completeJob,
  cancelJob,
  cleanupOldJobs,
  syncJobStatusFromK8s,
  getJobLogs,
} from './submit';
