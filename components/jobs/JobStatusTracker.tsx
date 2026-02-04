"use client";

/**
 * JobStatusTracker Component
 * 
 * Real-time progress tracking for background K8s jobs.
 * Uses SWR for polling with exponential backoff.
 */

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ===========================================
// Types
// ===========================================

type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
type JobType = "market-intel-scrape" | "newsletter-send" | "portal-publish-xe" | "bulk-export";

interface JobRecord {
  id: string;
  type: JobType;
  organizationId: string;
  status: JobStatus;
  progress: number;
  progressMessage?: string;
  k8sJobName?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface JobStatusResponse {
  job: JobRecord;
  k8sStatus?: {
    active?: number;
    succeeded?: number;
    failed?: number;
  };
}

// ===========================================
// Constants
// ===========================================

const JOB_TYPE_LABELS: Record<JobType, string> = {
  "market-intel-scrape": "Market Intelligence Scrape",
  "newsletter-send": "Newsletter Campaign",
  "portal-publish-xe": "XE.gr Publishing",
  "bulk-export": "Data Export",
};

const STATUS_CONFIG: Record<JobStatus, { icon: typeof Loader2; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning", label: "Pending" },
  running: { icon: Loader2, color: "text-primary", label: "Running" },
  completed: { icon: CheckCircle, color: "text-success", label: "Completed" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  cancelled: { icon: AlertCircle, color: "text-muted-foreground", label: "Cancelled" },
};

// ===========================================
// Fetcher
// ===========================================

const fetcher = async (url: string): Promise<JobStatusResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
};

// ===========================================
// Component Props
// ===========================================

export interface JobStatusTrackerProps {
  jobId: string;
  onComplete?: (job: JobRecord) => void;
  onError?: (job: JobRecord) => void;
  onCancel?: () => void;
  showCard?: boolean;
  compact?: boolean;
  className?: string;
}

// ===========================================
// Component
// ===========================================

export function JobStatusTracker({
  jobId,
  onComplete,
  onError,
  onCancel,
  showCard = true,
  compact = false,
  className,
}: JobStatusTrackerProps) {
  // Calculate refresh interval based on status
  const getRefreshInterval = (status?: JobStatus) => {
    if (!status || status === "pending" || status === "running") {
      return 2000; // Poll every 2 seconds while active
    }
    return 0; // Stop polling when complete
  };

  const { data, error, isLoading, mutate } = useSWR<JobStatusResponse>(
    `/api/jobs/${jobId}`,
    fetcher,
    {
      refreshInterval: (latestData) => getRefreshInterval(latestData?.job.status),
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    }
  );

  const job = data?.job;
  const status = job?.status || "pending";
  const progress = job?.progress || 0;
  const StatusIcon = STATUS_CONFIG[status].icon;

  // Handle completion/error callbacks
  useEffect(() => {
    if (!job) return;

    if (job.status === "completed" && onComplete) {
      onComplete(job);
      toast.success(`${JOB_TYPE_LABELS[job.type]} completed successfully!`);
    }

    if (job.status === "failed" && onError) {
      onError(job);
      toast.error(`${JOB_TYPE_LABELS[job.type]} failed: ${job.errorMessage || "Unknown error"}`);
    }
  }, [job?.status, job, onComplete, onError]);

  // Cancel job handler
  const handleCancel = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel job");
      
      toast.info("Job cancelled");
      mutate();
      onCancel?.();
    } catch (err) {
      toast.error("Failed to cancel job");
    }
  }, [jobId, mutate, onCancel]);

  // Format duration
  const formatDuration = (start?: string, end?: string) => {
    if (!start) return "-";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Render loading state
  if (isLoading && !data) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading job status...</span>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-sm">Failed to load job status</span>
      </div>
    );
  }

  // Compact variant
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <StatusIcon
          className={cn(
            "h-4 w-4",
            STATUS_CONFIG[status].color,
            status === "running" && "animate-spin"
          )}
        />
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-sm text-muted-foreground">{progress}%</span>
        {(status === "pending" || status === "running") && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  // Card variant
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              "h-5 w-5",
              STATUS_CONFIG[status].color,
              status === "running" && "animate-spin"
            )}
          />
          <span className="font-medium">{job ? JOB_TYPE_LABELS[job.type] : "Job"}</span>
        </div>
        <Badge
          variant={
            status === "completed"
              ? "default"
              : status === "failed"
              ? "destructive"
              : "secondary"
          }
        >
          {STATUS_CONFIG[status].label}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {job?.progressMessage && (
          <p className="text-sm text-muted-foreground">{job.progressMessage}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Duration: </span>
            <span>{formatDuration(job?.startedAt, job?.completedAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Job ID: </span>
            <span className="font-mono text-xs">{jobId.slice(0, 8)}...</span>
          </div>
        </div>

        {job?.errorMessage && (
          <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
            {job.errorMessage}
          </div>
        )}

        {(status === "pending" || status === "running") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="w-full mt-2"
          >
            Cancel Job
          </Button>
        )}
      </div>
    </>
  );

  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Job Status</CardTitle>
          <CardDescription>
            {status === "running"
              ? "Processing..."
              : status === "completed"
              ? "Job completed successfully"
              : status === "failed"
              ? "Job failed"
              : "Waiting to start"}
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}

// ===========================================
// Hook for programmatic tracking
// ===========================================

export function useJobStatus(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobStatusResponse>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        const status = latestData?.job.status;
        if (!status || status === "pending" || status === "running") {
          return 2000;
        }
        return 0;
      },
      revalidateOnFocus: false,
    }
  );

  return {
    job: data?.job || null,
    k8sStatus: data?.k8sStatus,
    isLoading,
    error,
    isComplete: data?.job.status === "completed",
    isFailed: data?.job.status === "failed",
    isRunning: data?.job.status === "running" || data?.job.status === "pending",
    refresh: mutate,
  };
}

export default JobStatusTracker;
