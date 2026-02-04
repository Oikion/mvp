"use client";

import { useTranslations } from "next-intl";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Eye,
  Archive,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackMetricsProps {
  countsByType: Record<string, number>;
  countsByStatus: Record<string, number>;
  totalCount: number;
}

export function FeedbackMetrics({
  countsByType,
  countsByStatus,
  totalCount,
}: FeedbackMetricsProps) {
  const t = useTranslations("platformAdmin");

  const typeIcons: Record<string, React.ElementType> = {
    bug: Bug,
    feature: Lightbulb,
    general: MessageCircle,
    question: HelpCircle,
    other: MoreHorizontal,
  };

  const statusIcons: Record<string, React.ElementType> = {
    pending: Clock,
    reviewed: Eye,
    resolved: CheckCircle2,
    archived: Archive,
  };

  const typeColors: Record<string, string> = {
    bug: "text-destructive",
    feature: "text-primary",
    general: "text-muted-foreground",
    question: "text-warning",
    other: "text-purple-500",
  };

  const statusColors: Record<string, string> = {
    pending: "text-warning",
    reviewed: "text-primary",
    resolved: "text-success",
    archived: "text-muted-foreground",
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Feedback Types */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("feedback.byType")}
        </h3>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {["bug", "feature", "general", "question", "other"].map((type) => {
            const Icon = typeIcons[type];
            const count = countsByType[type] || 0;
            return (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t(`feedback.types.${type}`)}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${typeColors[type]}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Status Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {t("feedback.byStatus")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["pending", "reviewed", "resolved", "archived"].map((status) => {
            const Icon = statusIcons[status];
            const count = countsByStatus[status] || 0;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t(`feedback.statuses.${status}`)}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${statusColors[status]}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalCount > 0
                      ? `${Math.round((count / totalCount) * 100)}%`
                      : "0%"}{" "}
                    {t("feedback.ofTotal")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}





