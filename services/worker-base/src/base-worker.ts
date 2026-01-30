/**
 * Base Worker - Abstract base class for K8s job workers
 */

import { createJobContext, type JobContext } from './job-context.js';
import { ProgressReporter } from './progress.js';
import { getLogger } from './logger.js';
import type { JobPayload, JobResult, WorkerFunction } from './types.js';

const logger = getLogger('base-worker');

export class BaseWorker<
  TPayload extends JobPayload = JobPayload,
  TResult extends JobResult = JobResult
> {
  protected context: JobContext<TPayload>;
  protected reporter: ProgressReporter;

  constructor() {
    this.context = createJobContext<TPayload>();
    this.reporter = new ProgressReporter(this.context);
  }

  /**
   * Run the worker with the provided function
   */
  async run(workerFn: WorkerFunction<TPayload, TResult>): Promise<void> {
    const startTime = Date.now();
    
    logger.info({
      jobId: this.context.jobId,
      jobType: this.context.jobType,
      organizationId: this.context.organizationId,
    }, 'Worker starting');

    try {
      // Report job started
      await this.reporter.progress(0, 'Starting job...');

      // Execute the worker function
      const result = await workerFn(this.context.payload, {
        progress: (progress, message) => this.reporter.progress(progress, message),
      });

      // Calculate duration
      const duration = Date.now() - startTime;
      const resultWithDuration = {
        ...result,
        duration,
      };

      // Report completion
      await this.reporter.complete(resultWithDuration);

      logger.info({
        jobId: this.context.jobId,
        duration,
      }, 'Worker completed successfully');

      // Exit with success
      process.exit(0);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error({
        jobId: this.context.jobId,
        error: errorMessage,
        stack: errorStack,
        duration,
      }, 'Worker failed');

      // Report failure
      try {
        await this.reporter.fail(errorMessage);
      } catch (reportError) {
        logger.error({ error: reportError }, 'Failed to report failure');
      }

      // Exit with failure
      process.exit(1);
    }
  }

  /**
   * Get job context
   */
  getContext(): JobContext<TPayload> {
    return this.context;
  }

  /**
   * Get progress reporter
   */
  getReporter(): ProgressReporter {
    return this.reporter;
  }
}

/**
 * Helper function to create and run a worker
 */
export async function runWorker<
  TPayload extends JobPayload,
  TResult extends JobResult
>(workerFn: WorkerFunction<TPayload, TResult>): Promise<void> {
  const worker = new BaseWorker<TPayload, TResult>();
  await worker.run(workerFn);
}
