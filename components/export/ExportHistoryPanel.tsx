"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  History,
  Download,
  RefreshCw,
  FileCode2,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import {
  useExportHistory,
  type ExportHistoryRecord,
  type ChangeDetectionResult,
} from "@/hooks/swr/use-export-history";

// ============================================
// TYPES
// ============================================

export interface ExportHistoryPanelProps {
  /** Entity type (e.g., PROPERTY, CLIENT) */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Entity name for display */
  entityName?: string;
  /** Callback when re-export is triggered */
  onReExport?: (record: ExportHistoryRecord) => void;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Whether to show change detection warnings */
  showChangeDetection?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// HELPERS
// ============================================

const getFormatIcon = (format: string) => {
  switch (format.toLowerCase()) {
    case "xml":
    case "xe-xml":
      return <FileCode2 className="h-4 w-4 text-warning" />;
    case "csv":
    case "spitogatos-csv":
      return <FileSpreadsheet className="h-4 w-4 text-success" />;
    case "pdf":
    case "pdf-flyer":
      return <FileText className="h-4 w-4 text-destructive" />;
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-4 w-4 text-success" />;
    default:
      return <Download className="h-4 w-4 text-muted-foreground" />;
  }
};

const getFormatLabel = (format: string, locale: string): string => {
  const labels: Record<string, { en: string; el: string }> = {
    "xe-xml": { en: "XE.gr XML", el: "XE.gr XML" },
    "spitogatos-csv": { en: "Spitogatos CSV", el: "Spitogatos CSV" },
    "pdf-flyer": { en: "PDF Flyer", el: "PDF Φυλλάδιο" },
    xml: { en: "XML", el: "XML" },
    csv: { en: "CSV", el: "CSV" },
    pdf: { en: "PDF", el: "PDF" },
    xlsx: { en: "Excel", el: "Excel" },
    xls: { en: "Excel", el: "Excel" },
  };
  const label = labels[format.toLowerCase()];
  return label ? (locale === "el" ? label.el : label.en) : format.toUpperCase();
};

const getDestinationLabel = (destination: string | null, locale: string): string => {
  if (!destination) return locale === "el" ? "Τοπική λήψη" : "Local download";
  const labels: Record<string, { en: string; el: string }> = {
    "xe.gr": { en: "XE.gr Portal", el: "Πύλη XE.gr" },
    spitogatos: { en: "Spitogatos Portal", el: "Πύλη Spitogatos" },
    local: { en: "Local download", el: "Τοπική λήψη" },
  };
  const label = labels[destination.toLowerCase()];
  return label ? (locale === "el" ? label.el : label.en) : destination;
};

// ============================================
// CHANGE DETECTION ALERT
// ============================================

interface ChangeDetectionAlertProps {
  changeDetection: ChangeDetectionResult;
  locale: string;
}

function ChangeDetectionAlert({ changeDetection, locale }: ChangeDetectionAlertProps) {
  if (!changeDetection.hasChanges) return null;

  const changedCount = changeDetection.changedFields.length;
  const labels = {
    title: locale === "el" ? "Αλλαγές από τελευταία εξαγωγή" : "Changes since last export",
    description:
      locale === "el"
        ? `${changedCount} πεδί${changedCount === 1 ? "ο" : "α"} έχ${changedCount === 1 ? "ει" : "ουν"} αλλάξει`
        : `${changedCount} field${changedCount === 1 ? "" : "s"} changed`,
    lastExport: locale === "el" ? "Τελευταία εξαγωγή" : "Last export",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
      <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {labels.title}
        </p>
        <p className="text-xs text-warning dark:text-amber-400">
          {labels.description}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {changeDetection.changedFields.slice(0, 5).map((change, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs border-warning/30 text-amber-700 dark:text-amber-300"
            >
              {change.label || change.field}
            </Badge>
          ))}
          {changeDetection.changedFields.length > 5 && (
            <Badge
              variant="outline"
              className="text-xs border-warning/30 text-amber-700 dark:text-amber-300"
            >
              +{changeDetection.changedFields.length - 5}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT HISTORY ITEM
// ============================================

interface ExportHistoryItemProps {
  record: ExportHistoryRecord;
  locale: string;
  onReExport?: (record: ExportHistoryRecord) => void;
}

function ExportHistoryItem({ record, locale, onReExport }: ExportHistoryItemProps) {
  const dateLocale = locale === "el" ? el : enUS;
  const timeAgo = formatDistanceToNow(new Date(record.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  });

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {getFormatIcon(record.exportFormat)}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {getFormatLabel(record.exportFormat, locale)}
            </span>
            {record.destination && (
              <Badge variant="secondary" className="text-xs">
                {getDestinationLabel(record.destination, locale)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {record.filename} • {timeAgo}
          </p>
        </div>
      </div>
      {onReExport && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onReExport(record)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {locale === "el" ? "Επανάληψη εξαγωγής" : "Re-export"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function ExportHistorySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExportHistoryPanel({
  entityType,
  entityId,
  entityName,
  onReExport,
  maxItems = 5,
  showChangeDetection = true,
  className,
}: ExportHistoryPanelProps) {
  const locale = useLocale() as "en" | "el";
  const { history, changeDetection, isLoading, error } = useExportHistory(
    entityType,
    entityId,
    { limit: maxItems }
  );

  const labels = {
    title: locale === "el" ? "Ιστορικό Εξαγωγών" : "Export History",
    description:
      locale === "el"
        ? "Προηγούμενες εξαγωγές για αυτό το στοιχείο"
        : "Previous exports for this item",
    noHistory:
      locale === "el"
        ? "Δεν υπάρχει ιστορικό εξαγωγών"
        : "No export history yet",
    errorLoading:
      locale === "el"
        ? "Αποτυχία φόρτωσης ιστορικού"
        : "Failed to load history",
    upToDate:
      locale === "el"
        ? "Όλες οι εξαγωγές είναι ενημερωμένες"
        : "All exports are up to date",
  };

  // Don't render if there's no history and no change detection
  if (!isLoading && history.length === 0 && !changeDetection?.hasChanges) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">{labels.title}</CardTitle>
            <CardDescription>{labels.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && <ExportHistorySkeleton />}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {labels.errorLoading}
          </div>
        )}

        {/* Change Detection Alert */}
        {!isLoading && showChangeDetection && changeDetection && (
          <ChangeDetectionAlert changeDetection={changeDetection} locale={locale} />
        )}

        {/* Up to Date Badge */}
        {!isLoading &&
          history.length > 0 &&
          changeDetection &&
          !changeDetection.hasChanges && (
            <div className="flex items-center gap-2 text-sm text-success dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {labels.upToDate}
            </div>
          )}

        {/* History List */}
        {!isLoading && !error && history.length > 0 && (
          <div className="space-y-2">
            {history.map((record) => (
              <ExportHistoryItem
                key={record.id}
                record={record}
                locale={locale}
                onReExport={onReExport}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && history.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {labels.noHistory}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
