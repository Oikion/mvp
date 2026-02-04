"use client";

import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";

interface XeSyncStatsProps {
  stats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    pendingSyncs: number;
    totalPropertiesSynced: number;
    lastSyncAt: Date | null;
  };
}

export function XeSyncStats({ stats }: XeSyncStatsProps) {
  const locale = useLocale() as "en" | "el";
  const dateLocale = locale === "el" ? el : enUS;

  const successRate = stats.totalSyncs > 0
    ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {locale === "el" ? "Δημοσιευμένα Ακίνητα" : "Published Properties"}
          </CardTitle>
          <Globe className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPropertiesSynced}</div>
          <p className="text-xs text-muted-foreground">
            {locale === "el" ? "ενεργές αγγελίες στο xe.gr" : "active listings on xe.gr"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {locale === "el" ? "Ποσοστό Επιτυχίας" : "Success Rate"}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.successfulSyncs} / {stats.totalSyncs}{" "}
            {locale === "el" ? "συγχρονισμοί" : "syncs"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {locale === "el" ? "Αποτυχίες" : "Failures"}
          </CardTitle>
          <XCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.failedSyncs}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingSyncs > 0 && (
              <>
                {stats.pendingSyncs}{" "}
                {locale === "el" ? "σε εκκρεμότητα" : "pending"}
              </>
            )}
            {stats.pendingSyncs === 0 && (
              locale === "el" ? "χρειάζονται επανάληψη" : "need retry"
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {locale === "el" ? "Τελευταίος Συγχρονισμός" : "Last Sync"}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.lastSyncAt
              ? format(new Date(stats.lastSyncAt), "dd MMM", {
                  locale: dateLocale,
                })
              : "—"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.lastSyncAt
              ? format(new Date(stats.lastSyncAt), "HH:mm", {
                  locale: dateLocale,
                })
              : locale === "el"
                ? "Δεν υπάρχει ιστορικό"
                : "No history yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
