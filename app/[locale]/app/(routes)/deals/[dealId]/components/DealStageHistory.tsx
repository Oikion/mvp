"use client";

import React, { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { DealStage } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { History, User } from "lucide-react";
import { DEAL_STATUS } from "@/lib/status-mappings";
import { cn } from "@/lib/utils";

interface DealStageLogEntry {
  readonly id: string;
  readonly fromStage: DealStage;
  readonly toStage: DealStage;
  readonly changedBy?: string | null;
  readonly changedAt: string | Date;
  readonly notes?: string | null;
}

interface DealStageHistoryProps {
  readonly logs: readonly DealStageLogEntry[];
  /**
   * Optional map from clerk userId → display name. When provided, log entries
   * show the user's name instead of the raw ID.
   */
  readonly userDisplayMap?: Readonly<Record<string, string>>;
}

export default function DealStageHistory({
  logs,
  userDisplayMap,
}: DealStageHistoryProps) {
  const t = useTranslations("deals");
  const format = useFormatter();

  // Hydration-safe relative timestamps: render absolute on the server,
  // upgrade to relative once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" aria-hidden="true" />
          {t("detail.stageLog")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {t("detail.noStageHistory")}
          </div>
        ) : (
          <ol className="relative space-y-4">
            {/* Vertical connecting line */}
            <div
              aria-hidden="true"
              className="absolute left-[15px] top-2 bottom-2 w-px bg-border"
            />
            {sorted.map((entry) => {
              const cfg = DEAL_STATUS[entry.toStage];
              const Icon = cfg?.icon ?? User;
              const fromLabel = t(`stage.${entry.fromStage}`);
              const toLabel = t(`stage.${entry.toStage}`);
              const changedAt = new Date(entry.changedAt);
              const userName =
                (entry.changedBy && userDisplayMap?.[entry.changedBy]) ||
                t("detail.unknownUser");

              return (
                <li key={entry.id} className="relative pl-10">
                  <div
                    className={cn(
                      "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background",
                      "border-primary/40 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {t("detail.stageLogEntry", {
                        user: userName,
                        from: fromLabel,
                        to: toLabel,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time
                        dateTime={changedAt.toISOString()}
                        title={format.dateTime(changedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      >
                        {mounted
                          ? format.relativeTime(changedAt, new Date())
                          : format.dateTime(changedAt, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                      </time>
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-2">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
