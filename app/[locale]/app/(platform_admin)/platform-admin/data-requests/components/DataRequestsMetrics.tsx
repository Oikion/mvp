"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Database,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface DataRequestsMetricsProps {
  counts: {
    total: number;
    pendingDeletions: number;
    pendingExports: number;
    completed: number;
    rejected: number;
  };
}

export function DataRequestsMetrics({ counts }: DataRequestsMetricsProps) {
  const t = useTranslations("platformAdmin.dataRequests.metrics");

  const metrics = [
    {
      label: t("total"),
      value: counts.total,
      icon: Database,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("pendingDeletions"),
      value: counts.pendingDeletions,
      icon: Trash2,
      color: "text-red-600",
      bgColor: "bg-red-500/10",
    },
    {
      label: t("pendingExports"),
      value: counts.pendingExports,
      icon: Download,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("completed"),
      value: counts.completed,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      label: t("rejected"),
      value: counts.rejected,
      icon: XCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5 mb-8">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
