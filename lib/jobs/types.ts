/**
 * Kubernetes Jobs Type Definitions
 * 
 * Unified types for the job orchestration layer that manages
 * background processing across Market Intelligence, Newsletter,
 * Portal Publishing, and Export operations.
 */

// ===========================================
// Job Type Enum
// ===========================================

export type JobType = 
  | 'market-intel-scrape'
  | 'newsletter-send'
  | 'portal-publish-xe'
  | 'bulk-export';

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  'market-intel-scrape': 'Market Intelligence Scrape',
  'newsletter-send': 'Newsletter Campaign',
  'portal-publish-xe': 'XE.gr Portal Publishing',
  'bulk-export': 'Bulk Data Export',
};

// ===========================================
// Job Status
// ===========================================

export type JobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobPriority = 'low' | 'normal' | 'high';

// ===========================================
// Job Submission Types
// ===========================================

export interface JobSubmission {
  type: JobType;
  organizationId: string;
  payload: JobPayload;
  priority?: JobPriority;
  metadata?: Record<string, unknown>;
}

export type JobPayload = 
  | MarketIntelPayload
  | NewsletterPayload
  | PortalPublishPayload
  | BulkExportPayload;

// Market Intelligence Scrape Payload
export interface MarketIntelPayload {
  type: 'market-intel-scrape';
  platforms: string[];
  targetAreas: string[];
  targetMunicipalities: string[];
  transactionTypes: string[];
  propertyTypes: string[];
  minPrice?: number;
  maxPrice?: number;
  maxPagesPerPlatform: number;
}

// Newsletter Send Payload
export interface NewsletterPayload {
  type: 'newsletter-send';
  campaignId: string;
  subscriberIds?: string[];
  batchSize?: number;
}

// Portal Publishing Payload
export interface PortalPublishPayload {
  type: 'portal-publish-xe';
  action: 'add' | 'remove';
  propertyIds: string[];
  skipAssets?: boolean;
}

// Bulk Export Payload
export interface BulkExportPayload {
  type: 'bulk-export';
  exportType: 'crm' | 'mls' | 'reports' | 'calendar';
  format: 'xlsx' | 'xls' | 'csv' | 'pdf' | 'xml';
  filters?: Record<string, unknown>;
  locale?: 'en' | 'el';
}

// ===========================================
// Job Record (Database Model)
// ===========================================

export interface JobRecord {
  id: string;
  type: JobType;
  organizationId: string;
  status: JobStatus;
  progress: number; // 0-100
  progressMessage?: string;
  k8sJobName?: string;
  k8sPodName?: string;
  payload: JobPayload;
  result?: JobResult;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
}

// ===========================================
// Job Result Types
// ===========================================

export type JobResult = 
  | MarketIntelResult
  | NewsletterResult
  | PortalPublishResult
  | BulkExportResult;

export interface MarketIntelResult {
  type: 'market-intel-scrape';
  platforms: {
    platform: string;
    status: 'completed' | 'failed';
    listingsFound: number;
    listingsNew: number;
    listingsUpdated: number;
    errors?: string[];
  }[];
  totalListings: number;
  totalNew: number;
  totalUpdated: number;
  duration: number;
}

export interface NewsletterResult {
  type: 'newsletter-send';
  campaignId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bounceCount?: number;
  duration: number;
}

export interface PortalPublishResult {
  type: 'portal-publish-xe';
  action: 'add' | 'remove';
  totalProperties: number;
  successCount: number;
  failedCount: number;
  portalResponse?: unknown;
  duration: number;
}

export interface BulkExportResult {
  type: 'bulk-export';
  exportType: string;
  format: string;
  rowCount: number;
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
  duration: number;
}

// ===========================================
// Kubernetes Job Specification
// ===========================================

export interface K8sJobSpec {
  jobName: string;
  namespace: string;
  image: string;
  command?: string[];
  args?: string[];
  env: K8sEnvVar[];
  resources: K8sResourceRequirements;
  backoffLimit?: number;
  activeDeadlineSeconds?: number;
  ttlSecondsAfterFinished?: number;
}

export interface K8sEnvVar {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
    configMapKeyRef?: {
      name: string;
      key: string;
    };
  };
}

export interface K8sResourceRequirements {
  requests: {
    cpu: string;
    memory: string;
  };
  limits: {
    cpu: string;
    memory: string;
  };
}

export interface K8sJobStatus {
  active?: number;
  succeeded?: number;
  failed?: number;
  startTime?: Date;
  completionTime?: Date;
  conditions?: K8sJobCondition[];
}

export interface K8sJobCondition {
  type: 'Complete' | 'Failed' | 'Suspended';
  status: 'True' | 'False' | 'Unknown';
  lastProbeTime?: Date;
  lastTransitionTime?: Date;
  reason?: string;
  message?: string;
}

// ===========================================
// Job Configuration per Type
// ===========================================

export interface JobTypeConfig {
  type: JobType;
  image: string;
  defaultResources: K8sResourceRequirements;
  defaultTimeout: number; // seconds
  maxRetries: number;
  namespace: string;
}

export const JOB_CONFIGS: Record<JobType, JobTypeConfig> = {
  'market-intel-scrape': {
    type: 'market-intel-scrape',
    image: 'registry.digitalocean.com/oikion/mi-scraper:latest',
    defaultResources: {
      requests: { cpu: '250m', memory: '512Mi' },
      limits: { cpu: '1000m', memory: '2Gi' },
    },
    defaultTimeout: 1800, // 30 minutes
    maxRetries: 2,
    namespace: 'oikion-jobs',
  },
  'newsletter-send': {
    type: 'newsletter-send',
    image: 'registry.digitalocean.com/oikion/newsletter-worker:latest',
    defaultResources: {
      requests: { cpu: '100m', memory: '256Mi' },
      limits: { cpu: '500m', memory: '512Mi' },
    },
    defaultTimeout: 3600, // 1 hour
    maxRetries: 3,
    namespace: 'oikion-jobs',
  },
  'portal-publish-xe': {
    type: 'portal-publish-xe',
    image: 'registry.digitalocean.com/oikion/portal-worker:latest',
    defaultResources: {
      requests: { cpu: '200m', memory: '512Mi' },
      limits: { cpu: '500m', memory: '1Gi' },
    },
    defaultTimeout: 1800, // 30 minutes
    maxRetries: 2,
    namespace: 'oikion-jobs',
  },
  'bulk-export': {
    type: 'bulk-export',
    image: 'registry.digitalocean.com/oikion/export-worker:latest',
    defaultResources: {
      requests: { cpu: '200m', memory: '512Mi' },
      limits: { cpu: '1000m', memory: '2Gi' },
    },
    defaultTimeout: 900, // 15 minutes
    maxRetries: 2,
    namespace: 'oikion-jobs',
  },
};

// ===========================================
// Progress Update Types
// ===========================================

export interface JobProgressUpdate {
  jobId: string;
  progress: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface JobCompletionUpdate {
  jobId: string;
  status: 'completed' | 'failed';
  result?: JobResult;
  errorMessage?: string;
}

// ===========================================
// API Response Types
// ===========================================

export interface JobSubmissionResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
  message?: string;
}

export interface JobStatusResponse {
  job: JobRecord;
  k8sStatus?: K8sJobStatus;
}

export interface JobListResponse {
  jobs: JobRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// ===========================================
// Webhook Types
// ===========================================

export interface JobWebhookPayload {
  event: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed';
  jobId: string;
  organizationId: string;
  type: JobType;
  timestamp: Date;
  data: {
    progress?: number;
    message?: string;
    result?: JobResult;
    errorMessage?: string;
  };
}
