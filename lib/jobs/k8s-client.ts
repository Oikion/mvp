/**
 * Kubernetes Client for Job Orchestration
 * 
 * Provides an interface to the Kubernetes API for creating,
 * monitoring, and managing background jobs.
 */

import {
  type JobType,
  type K8sJobSpec,
  type K8sJobStatus,
  type K8sEnvVar,
  type JobPayload,
  JOB_CONFIGS,
} from './types';

// ===========================================
// Configuration
// ===========================================

const K8S_API_URL = process.env.K8S_API_URL || 'https://kubernetes.default.svc';
const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'oikion-jobs';
const K8S_SERVICE_ACCOUNT_TOKEN = process.env.K8S_SERVICE_ACCOUNT_TOKEN;

// In-cluster detection
const isInCluster = !!process.env.KUBERNETES_SERVICE_HOST;

// ===========================================
// Helper Functions
// ===========================================

async function getK8sToken(): Promise<string> {
  if (K8S_SERVICE_ACCOUNT_TOKEN) {
    return K8S_SERVICE_ACCOUNT_TOKEN;
  }
  
  // In-cluster: read from mounted service account
  if (isInCluster) {
    const fs = await import('fs/promises');
    try {
      return await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf-8');
    } catch {
      throw new Error('Failed to read in-cluster service account token');
    }
  }
  
  throw new Error('K8S_SERVICE_ACCOUNT_TOKEN not configured and not running in cluster');
}

async function k8sRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getK8sToken();
  
  const response = await fetch(`${K8S_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`K8s API error (${response.status}): ${errorBody}`);
  }
  
  return response.json();
}

// ===========================================
// Job Name Generation
// ===========================================

export function generateJobName(type: JobType, organizationId: string): string {
  const prefix = type.replace(/-/g, '');
  const orgShort = organizationId.slice(0, 8).toLowerCase();
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  
  // K8s job names must be lowercase, alphanumeric, and max 63 chars
  return `${prefix}-${orgShort}-${timestamp}-${random}`.substring(0, 63);
}

// ===========================================
// Job Manifest Builder
// ===========================================

interface CreateJobOptions {
  jobId: string;
  type: JobType;
  organizationId: string;
  payload: JobPayload;
  callbackUrl?: string;
  redisUrl?: string;
}

export function buildJobManifest(options: CreateJobOptions): object {
  const { jobId, type, organizationId, payload, callbackUrl, redisUrl } = options;
  const config = JOB_CONFIGS[type];
  const jobName = generateJobName(type, organizationId);
  
  const envVars: K8sEnvVar[] = [
    { name: 'JOB_ID', value: jobId },
    { name: 'JOB_TYPE', value: type },
    { name: 'ORGANIZATION_ID', value: organizationId },
    { name: 'PAYLOAD', value: JSON.stringify(payload) },
    {
      name: 'DATABASE_URL',
      valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'database-url' } }
    },
  ];
  
  if (callbackUrl) {
    envVars.push({ name: 'CALLBACK_URL', value: callbackUrl });
  }
  
  if (redisUrl) {
    envVars.push({ name: 'REDIS_URL', value: redisUrl });
  } else {
    envVars.push({
      name: 'REDIS_URL',
      valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'redis-url' } }
    });
  }
  
  // Add type-specific secrets
  if (type === 'newsletter-send') {
    envVars.push({
      name: 'RESEND_API_KEY',
      valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'resend-api-key' } }
    });
  }
  
  if (type === 'portal-publish-xe') {
    envVars.push(
      {
        name: 'XE_GR_USERNAME',
        valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'xe-gr-username' } }
      },
      {
        name: 'XE_GR_PASSWORD',
        valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'xe-gr-password' } }
      },
      {
        name: 'XE_GR_AUTHTOKEN',
        valueFrom: { secretKeyRef: { name: 'oikion-secrets', key: 'xe-gr-authtoken' } }
      }
    );
  }
  
  return {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace: config.namespace,
      labels: {
        'app.kubernetes.io/name': 'oikion-job',
        'app.kubernetes.io/component': type,
        'oikion.com/job-id': jobId,
        'oikion.com/organization-id': organizationId,
      },
    },
    spec: {
      backoffLimit: config.maxRetries,
      activeDeadlineSeconds: config.defaultTimeout,
      ttlSecondsAfterFinished: 3600, // Clean up after 1 hour
      template: {
        metadata: {
          labels: {
            'app.kubernetes.io/name': 'oikion-job',
            'app.kubernetes.io/component': type,
            'oikion.com/job-id': jobId,
          },
        },
        spec: {
          restartPolicy: 'Never',
          containers: [{
            name: 'worker',
            image: config.image,
            resources: config.defaultResources,
            env: envVars.map(e => {
              if (e.valueFrom) {
                return { name: e.name, valueFrom: e.valueFrom };
              }
              return { name: e.name, value: e.value };
            }),
          }],
        },
      },
    },
  };
}

// ===========================================
// Kubernetes API Operations
// ===========================================

export class K8sClient {
  private namespace: string;
  
  constructor(namespace?: string) {
    this.namespace = namespace || K8S_NAMESPACE;
  }
  
  /**
   * Create a new K8s Job
   */
  async createJob(options: CreateJobOptions): Promise<{ jobName: string }> {
    const manifest = buildJobManifest(options);
    const jobName = (manifest as any).metadata.name;
    
    await k8sRequest(
      `/apis/batch/v1/namespaces/${this.namespace}/jobs`,
      {
        method: 'POST',
        body: JSON.stringify(manifest),
      }
    );
    
    return { jobName };
  }
  
  /**
   * Get job status from K8s
   */
  async getJobStatus(jobName: string): Promise<K8sJobStatus | null> {
    try {
      const job = await k8sRequest<any>(
        `/apis/batch/v1/namespaces/${this.namespace}/jobs/${jobName}`
      );
      
      return {
        active: job.status?.active || 0,
        succeeded: job.status?.succeeded || 0,
        failed: job.status?.failed || 0,
        startTime: job.status?.startTime ? new Date(job.status.startTime) : undefined,
        completionTime: job.status?.completionTime ? new Date(job.status.completionTime) : undefined,
        conditions: job.status?.conditions?.map((c: any) => ({
          type: c.type,
          status: c.status,
          lastProbeTime: c.lastProbeTime ? new Date(c.lastProbeTime) : undefined,
          lastTransitionTime: c.lastTransitionTime ? new Date(c.lastTransitionTime) : undefined,
          reason: c.reason,
          message: c.message,
        })),
      };
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Get pod name for a job
   */
  async getJobPodName(jobName: string): Promise<string | null> {
    try {
      const pods = await k8sRequest<any>(
        `/api/v1/namespaces/${this.namespace}/pods?labelSelector=job-name=${jobName}`
      );
      
      if (pods.items && pods.items.length > 0) {
        return pods.items[0].metadata.name;
      }
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Get logs from a job's pod
   */
  async getJobLogs(jobName: string, tailLines?: number): Promise<string> {
    const podName = await this.getJobPodName(jobName);
    if (!podName) {
      throw new Error(`No pod found for job ${jobName}`);
    }
    
    const params = new URLSearchParams();
    if (tailLines) {
      params.set('tailLines', tailLines.toString());
    }
    
    const response = await fetch(
      `${K8S_API_URL}/api/v1/namespaces/${this.namespace}/pods/${podName}/log?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${await getK8sToken()}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get logs: ${response.status}`);
    }
    
    return response.text();
  }
  
  /**
   * Delete a job (and its pods)
   */
  async deleteJob(jobName: string): Promise<void> {
    await k8sRequest(
      `/apis/batch/v1/namespaces/${this.namespace}/jobs/${jobName}?propagationPolicy=Background`,
      { method: 'DELETE' }
    );
  }
  
  /**
   * List jobs by organization
   */
  async listJobsByOrganization(organizationId: string): Promise<any[]> {
    const jobs = await k8sRequest<any>(
      `/apis/batch/v1/namespaces/${this.namespace}/jobs?labelSelector=oikion.com/organization-id=${organizationId}`
    );
    
    return jobs.items || [];
  }
  
  /**
   * Check if job is complete (succeeded or failed)
   */
  async isJobComplete(jobName: string): Promise<{ complete: boolean; succeeded: boolean }> {
    const status = await this.getJobStatus(jobName);
    
    if (!status) {
      return { complete: false, succeeded: false };
    }
    
    if (status.succeeded && status.succeeded > 0) {
      return { complete: true, succeeded: true };
    }
    
    if (status.failed && status.failed > 0) {
      return { complete: true, succeeded: false };
    }
    
    if (status.conditions) {
      const failedCondition = status.conditions.find(
        c => c.type === 'Failed' && c.status === 'True'
      );
      if (failedCondition) {
        return { complete: true, succeeded: false };
      }
      
      const completeCondition = status.conditions.find(
        c => c.type === 'Complete' && c.status === 'True'
      );
      if (completeCondition) {
        return { complete: true, succeeded: true };
      }
    }
    
    return { complete: false, succeeded: false };
  }
}

// ===========================================
// Singleton Instance
// ===========================================

let k8sClientInstance: K8sClient | null = null;

export function getK8sClient(): K8sClient {
  if (!k8sClientInstance) {
    k8sClientInstance = new K8sClient();
  }
  return k8sClientInstance;
}

// ===========================================
// Mock Client for Development
// ===========================================

export class MockK8sClient extends K8sClient {
  private mockJobs: Map<string, { status: K8sJobStatus; manifest: object }> = new Map();
  
  async createJob(options: CreateJobOptions): Promise<{ jobName: string }> {
    const manifest = buildJobManifest(options);
    const jobName = (manifest as any).metadata.name;
    
    this.mockJobs.set(jobName, {
      manifest,
      status: {
        active: 1,
        succeeded: 0,
        failed: 0,
        startTime: new Date(),
      },
    });
    
    // Simulate job completion after 5 seconds
    setTimeout(() => {
      const job = this.mockJobs.get(jobName);
      if (job) {
        job.status = {
          active: 0,
          succeeded: 1,
          failed: 0,
          startTime: job.status.startTime,
          completionTime: new Date(),
          conditions: [{
            type: 'Complete',
            status: 'True',
            lastTransitionTime: new Date(),
          }],
        };
      }
    }, 5000);
    
    console.log(`[MockK8s] Created job: ${jobName}`);
    return { jobName };
  }
  
  async getJobStatus(jobName: string): Promise<K8sJobStatus | null> {
    const job = this.mockJobs.get(jobName);
    return job?.status || null;
  }
  
  async getJobPodName(jobName: string): Promise<string | null> {
    return this.mockJobs.has(jobName) ? `${jobName}-pod` : null;
  }
  
  async getJobLogs(): Promise<string> {
    return '[MockK8s] Job logs would appear here';
  }
  
  async deleteJob(jobName: string): Promise<void> {
    this.mockJobs.delete(jobName);
    console.log(`[MockK8s] Deleted job: ${jobName}`);
  }
  
  async listJobsByOrganization(organizationId: string): Promise<any[]> {
    const jobs: any[] = [];
    this.mockJobs.forEach((value, key) => {
      const labels = (value.manifest as any).metadata.labels;
      if (labels['oikion.com/organization-id'] === organizationId) {
        jobs.push({ metadata: { name: key }, status: value.status });
      }
    });
    return jobs;
  }
}

/**
 * Get appropriate K8s client based on environment
 */
export function getK8sClientForEnv(): K8sClient {
  if (process.env.NODE_ENV === 'development' && !process.env.K8S_API_URL) {
    console.log('[K8s] Using mock client for development');
    return new MockK8sClient();
  }
  return getK8sClient();
}
