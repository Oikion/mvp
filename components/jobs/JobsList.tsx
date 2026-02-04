"use client";

/**
 * JobsList Component
 * 
 * Lists recent background jobs for the organization.
 */

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ===========================================
// Types
// ===========================================

type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
type JobType = "market-intel-scrape" | "newsletter-send" | "portal-publish-xe" | "bulk-export";

interface JobRecord {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  progressMessage?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface JobsListResponse {
  jobs: JobRecord[];
  total: number;
  hasMore: boolean;
}

// ===========================================
// Constants
// ===========================================

const JOB_TYPE_LABELS: Record<JobType, string> = {
  "market-intel-scrape": "Market Intelligence",
  "newsletter-send": "Newsletter",
  "portal-publish-xe": "XE.gr Publishing",
  "bulk-export": "Export",
};

const JOB_TYPE_ICONS: Record<JobType, string> = {
  "market-intel-scrape": "📊",
  "newsletter-send": "📧",
  "portal-publish-xe": "🏠",
  "bulk-export": "📁",
};

const STATUS_CONFIG: Record<JobStatus, { icon: typeof Loader2; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { icon: Clock, color: "text-warning", variant: "secondary" },
  running: { icon: Loader2, color: "text-primary", variant: "default" },
  completed: { icon: CheckCircle, color: "text-success", variant: "default" },
  failed: { icon: XCircle, color: "text-destructive", variant: "destructive" },
  cancelled: { icon: AlertCircle, color: "text-muted-foreground", variant: "outline" },
};

// ===========================================
// Fetcher
// ===========================================

const fetcher = async (url: string): Promise<JobsListResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
};

// ===========================================
// Component Props
// ===========================================

export interface JobsListProps {
  limit?: number;
  type?: JobType;
  status?: JobStatus;
  onJobClick?: (jobId: string) => void;
  className?: string;
  showCard?: boolean;
}

// ===========================================
// Component
// ===========================================

export function JobsList({
  limit = 10,
  type,
  status,
  onJobClick,
  className,
  showCard = true,
}: JobsListProps) {
  // Build query string
  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  if (type) params.set("type", type);
  if (status) params.set("status", status);

  const { data, error, isLoading } = useSWR<JobsListResponse>(
    `/api/jobs?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true,
    }
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load jobs
      </div>
    );
  }

  // Empty state
  if (!data?.jobs.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No jobs found
      </div>
    );
  }

  const content = (
    <div className="space-y-2">
      {data.jobs.map((job) => {
        const StatusIcon = STATUS_CONFIG[job.status].icon;
        const statusConfig = STATUS_CONFIG[job.status];

        return (
          <div
            key={job.id}
            onClick={() => onJobClick?.(job.id)}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
              onJobClick && "cursor-pointer"
            )}
          >
            {/* Icon */}
            <div className="text-2xl">{JOB_TYPE_ICONS[job.type]}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {JOB_TYPE_LABELS[job.type]}
                </span>
                <Badge variant={statusConfig.variant} className="shrink-0">
                  <StatusIcon
                    className={cn(
                      "h-3 w-3 mr-1",
                      statusConfig.color,
                      job.status === "running" && "animate-spin"
                    )}
                  />
                  {job.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {job.status === "running" && job.progressMessage ? (
                  <span>{job.progressMessage} ({job.progress}%)</span>
                ) : (
                  <span>
                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              {job.errorMessage && (
                <div className="text-xs text-destructive truncate mt-1">
                  {job.errorMessage}
                </div>
              )}
            </div>

            {/* Progress for running jobs */}
            {job.status === "running" && (
              <div className="w-16 text-right text-sm font-medium">
                {job.progress}%
              </div>
            )}

            {/* Arrow */}
            {onJobClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );

  if (showCard) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Background tasks and their status
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
}

export default JobsList;
