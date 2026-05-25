-- AlterEnum
ALTER TYPE "ReminderStatus" ADD VALUE 'PROCESSING';

-- CreateTable
CREATE TABLE "cron_execution_logs" (
    "id" TEXT NOT NULL,
    "cronName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "details" JSONB,
    "errorMsg" TEXT,

    CONSTRAINT "cron_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cron_execution_logs_cronName_startedAt_idx" ON "cron_execution_logs"("cronName", "startedAt");
