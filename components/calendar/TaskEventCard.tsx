"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface TaskEventCardProps {
  task: {
    id: string;
    title: string;
    content?: string | null;
    dueDateAt: Date | string;
    priority: string;
    assigned_user?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    crm_accounts?: {
      id: string;
      client_name: string;
    } | null;
    calcomEventId?: string | null;
  };
}

export function TaskEventCard({ task }: TaskEventCardProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const dueDate = new Date(task.dueDateAt);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            {task.title}
          </CardTitle>
          <Badge variant={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {task.content && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.content}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{format(dueDate, "MMM d, yyyy 'at' HH:mm")}</span>
          {task.calcomEventId && (
            <Badge variant="outline" className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              {t("taskEventCard.synced")}
            </Badge>
          )}
        </div>

        {task.assigned_user && (
          <div className="text-xs text-muted-foreground">
            {t("taskEventCard.assignedTo", { name: task.assigned_user.name || task.assigned_user.email })}
          </div>
        )}

        {task.crm_accounts && (
          <div className="text-xs text-muted-foreground">
            {t("taskEventCard.account", { name: task.crm_accounts.client_name })}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => router.push(`/crm/tasks/viewtask/${task.id}`)}
        >
          {t("taskEventCard.viewTask")}
          <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

