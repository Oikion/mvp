/**
 * Job Context - Parses environment variables and provides job metadata
 */

import type { JobEnv, JobPayload } from './types.js';
import { getLogger } from './logger.js';

const logger = getLogger('job-context');

export interface JobContext<T extends JobPayload = JobPayload> {
  jobId: string;
  jobType: string;
  organizationId: string;
  payload: T;
  databaseUrl: string;
  callbackUrl?: string;
  redisUrl?: string;
}

/**
 * Create job context from environment variables
 */
export function createJobContext<T extends JobPayload = JobPayload>(): JobContext<T> {
  const env = process.env as unknown as Partial<JobEnv>;

  // Validate required environment variables
  const required = ['JOB_ID', 'JOB_TYPE', 'ORGANIZATION_ID', 'PAYLOAD', 'DATABASE_URL'];
  const missing = required.filter(key => !env[key as keyof JobEnv]);

  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing required environment variables');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Parse payload
  let payload: T;
  try {
    payload = JSON.parse(env.PAYLOAD!) as T;
  } catch (error) {
    logger.fatal({ error, payload: env.PAYLOAD }, 'Failed to parse PAYLOAD');
    throw new Error('Failed to parse PAYLOAD environment variable');
  }

  const context: JobContext<T> = {
    jobId: env.JOB_ID!,
    jobType: env.JOB_TYPE!,
    organizationId: env.ORGANIZATION_ID!,
    payload,
    databaseUrl: env.DATABASE_URL!,
    callbackUrl: env.CALLBACK_URL,
    redisUrl: env.REDIS_URL,
  };

  logger.info({ 
    jobId: context.jobId, 
    jobType: context.jobType,
    organizationId: context.organizationId,
  }, 'Job context created');

  return context;
}
