/**
 * Worker Base Types
 */

export interface JobEnv {
  JOB_ID: string;
  JOB_TYPE: string;
  ORGANIZATION_ID: string;
  PAYLOAD: string;
  DATABASE_URL: string;
  CALLBACK_URL?: string;
  REDIS_URL?: string;
}

export interface JobPayload {
  [key: string]: unknown;
}

export interface JobResult {
  type: string;
  [key: string]: unknown;
}

export interface ProgressUpdate {
  progress: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface JobCompletionData {
  status: 'completed' | 'failed';
  result?: JobResult;
  errorMessage?: string;
}

export type WorkerFunction<TPayload extends JobPayload, TResult extends JobResult> = (
  payload: TPayload,
  reporter: {
    progress: (progress: number, message?: string) => Promise<void>;
  }
) => Promise<TResult>;
