import { prismadb } from "@/lib/prisma";

/**
 * Record the start of a cron job execution.
 * Returns the new log row ID (or "" if the insert fails — callers must handle
 * the empty-string case, which completeCronExecution / failCronExecution do).
 */
export async function startCronExecution(cronName: string): Promise<string> {
  const log = await prismadb.cronExecutionLog
    .create({
      data: { cronName, status: "RUNNING" },
    })
    .catch(() => null);
  return log?.id ?? "";
}

/**
 * Mark a cron execution as COMPLETED and persist an optional summary object.
 */
export async function completeCronExecution(
  id: string,
  details?: Record<string, unknown>,
): Promise<void> {
  if (!id) return;
  await prismadb.cronExecutionLog
    .update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status: "COMPLETED", completedAt: new Date(), ...(details ? { details: details as any } : {}) },
    })
    .catch((e) => console.error("[CRON_LOG] complete failed", e));
}

/**
 * Mark a cron execution as FAILED and record the error message.
 */
export async function failCronExecution(id: string, err: unknown): Promise<void> {
  if (!id) return;
  await prismadb.cronExecutionLog
    .update({
      where: { id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMsg: err instanceof Error ? err.message : String(err),
      },
    })
    .catch((e) => console.error("[CRON_LOG] fail update failed", e));
}
