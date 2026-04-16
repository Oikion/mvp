"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  XCircle,
  SkipForward,
  Trash2,
  AlertTriangle,
  Users,
  Building2,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/navigation";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportDetailRecord {
  id: string;
  importType: string;
  sourceFilename: string;
  rowCount: number;
  createdCount: number;
  reusedCount: number;
  failedCount: number;
  skippedCount: number;
  status: string;
  createdAt: string;
  errorDetails: Array<{
    row: number;
    field: string;
    error: string;
    value?: string;
  }> | null;
  resultDetails: unknown;
  entityIds: string[];
}

interface ImportDetailClientProps {
  record: ImportDetailRecord;
}

/** New typed format from the unified import engine */
interface TypedEntityEntry {
  uuid: string;
  friendlyId: string;
}

interface TypedResultDetails {
  // v2 keys (contact/request)
  contacts?: TypedEntityEntry[];
  requests?: TypedEntityEntry[];
  // legacy keys kept for reading old records
  clients?: TypedEntityEntry[];
  mandates?: TypedEntityEntry[];
  properties?: TypedEntityEntry[];
  linkCounts?: {
    // v2 keys
    contactProperty?: number;
    requestProperty?: number;
    requestContact?: number;
    // legacy keys kept for reading old stored records
    clientProperty?: number;
    mandateProperty?: number;
    mandateClient?: number;
  };
  entityBreakdown?: Record<string, { created: number; failed: number }>;
}

/** Impact scan data shape returned by /api/import/history/[id]/impact */
interface ImpactData {
  entities: {
    clients: number;
    properties: number;
    mandates: number;
  };
  cascade: {
    clientPropertyLinks: number;
    mandatePropertyLinks: number;
    mandateClientLinks: number;
    deals: number;
  };
}

type EntityType = "clients" | "properties" | "mandates";
const ALL_ENTITY_TYPES: EntityType[] = ["clients", "properties", "mandates"];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Returns true if resultDetails contains the new typed array format */
function isTypedResultDetails(rd: unknown): rd is TypedResultDetails {
  if (!rd || typeof rd !== "object") return false;
  return (
    Array.isArray((rd as Record<string, unknown>).clients) ||
    Array.isArray((rd as Record<string, unknown>).properties) ||
    Array.isArray((rd as Record<string, unknown>).mandates)
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CLASSES: Record<string, string> = {
  CLIENTS:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROPERTIES:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MANDATES:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  UNIFIED: "bg-primary/10 text-primary",
};

const ENTITY_CONFIG: Record<
  EntityType,
  {
    labelKey: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
  }
> = {
  clients: {
    labelKey: "detail.clients",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Users,
    href: "/app/crm/clients",
  },
  properties: {
    labelKey: "detail.properties",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: Building2,
    href: "/app/mls/properties",
  },
  mandates: {
    labelKey: "detail.mandates",
    badgeClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    icon: FileText,
    href: "/app/requests",
  },
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLETED: "default",
  PARTIALLY_FAILED: "outline",
  FAILED: "destructive",
  BATCH_DELETED: "secondary",
  PARTIALLY_DELETED: "outline",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImpactReport({ data }: Readonly<{ data: ImpactData }>) {
  const t = useTranslations("import.history");
  const hasEntities =
    data.entities.clients > 0 ||
    data.entities.properties > 0 ||
    data.entities.mandates > 0;

  const hasCascade =
    data.cascade.clientPropertyLinks > 0 ||
    data.cascade.mandatePropertyLinks > 0 ||
    data.cascade.mandateClientLinks > 0 ||
    data.cascade.deals > 0;

  return (
    <div className="space-y-3 text-sm">
      {hasEntities ? (
        <div className="space-y-1">
          {data.entities.clients > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">
                {data.entities.clients}
              </span>
              <span className="text-muted-foreground">{t("detail.clients")}</span>
            </div>
          )}
          {data.entities.properties > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">
                {data.entities.properties}
              </span>
              <span className="text-muted-foreground">{t("detail.properties")}</span>
            </div>
          )}
          {data.entities.mandates > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">
                {data.entities.mandates}
              </span>
              <span className="text-muted-foreground">{t("detail.mandates")}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground italic">
          {t("batchDelete.noEntities")}
        </p>
      )}

      {hasCascade && (
        <div className="space-y-1 border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            {t("batchDelete.alsoRemove")}
          </p>
          {data.cascade.clientPropertyLinks > 0 && (
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.clientPropertyLinks", { count: data.cascade.clientPropertyLinks })}</span>
            </div>
          )}
          {data.cascade.mandatePropertyLinks > 0 && (
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.mandatePropertyLinks", { count: data.cascade.mandatePropertyLinks })}</span>
            </div>
          )}
          {data.cascade.mandateClientLinks > 0 && (
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.mandateClientLinks", { count: data.cascade.mandateClientLinks })}</span>
            </div>
          )}
          {data.cascade.deals > 0 && (
            <div className="text-muted-foreground flex items-center gap-2">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.dealsLinked", { count: data.cascade.deals })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImpactSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function ImpactSection({
  impactLoading,
  impactError,
  impactData,
}: Readonly<{
  impactLoading: boolean;
  impactError: boolean;
  impactData: ImpactData | null;
}>) {
  const t = useTranslations("import.history");
  if (impactLoading) return <ImpactSkeleton />;
  if (impactError) {
    return (
      <p className="text-destructive text-sm">
        {t("batchDelete.impactError")}
      </p>
    );
  }
  if (!impactData) return null;
  return (
    <>
      <ImpactReport data={impactData} />
      <div className="border-destructive/30 bg-destructive/5 flex items-start gap-2 rounded-md border p-3">
        <AlertTriangle
          className="text-destructive mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <p className="text-destructive text-sm font-medium">
          {t("batchDelete.cannotUndo")}
        </p>
      </div>
    </>
  );
}

/** Collapsible list of friendly IDs — shows first 5, with expand toggle */
function FriendlyIdList({
  entries,
  isDeleted,
}: Readonly<{ entries: TypedEntityEntry[]; isDeleted: boolean }>) {
  const t = useTranslations("import.history");
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 5;
  const visible = expanded ? entries : entries.slice(0, LIMIT);
  const overflow = entries.length - LIMIT;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {visible.map((e) => (
          <code
            key={e.uuid}
            className={`rounded bg-muted px-1.5 py-0.5 font-mono text-xs ${
              isDeleted ? "line-through opacity-50" : ""
            }`}
          >
            {e.friendlyId}
          </code>
        ))}
      </div>
      {entries.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              {t("batchDelete.showLess")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              {t("batchDelete.showMore", { count: overflow })}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/** A single typed entity card (new format) */
function TypedEntityCard({
  entityType,
  entries,
  isDeleted,
}: Readonly<{
  entityType: EntityType;
  entries: TypedEntityEntry[];
  isDeleted: boolean;
}>) {
  const t = useTranslations("import.history");
  const config = ENTITY_CONFIG[entityType];
  const Icon = config.icon;

  return (
    <Card className={isDeleted ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">
              {t(config.labelKey as Parameters<typeof t>[0])}
            </CardTitle>
          </div>
          <Badge variant="secondary" className={config.badgeClass}>
            {entries.length}
          </Badge>
        </div>
        {isDeleted && (
          <p className="text-xs text-muted-foreground italic">
            {t("detail.entityDeleted")}
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            {isDeleted ? t("detail.allDeleted") : t("detail.noEntities")}
          </p>
        ) : (
          <FriendlyIdList entries={entries} isDeleted={isDeleted} />
        )}
      </CardContent>
      {!isDeleted && entries.length > 0 && (
        <CardFooter className="pt-0">
          <Button variant="outline" size="sm" asChild className="gap-1.5 h-7 text-xs">
            <Link href={config.href}>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              {t("detail.viewInModule")}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/** Legacy entity breakdown card (old format) */
function LegacyEntityCard({
  entity,
  counts,
}: Readonly<{
  entity: string;
  counts: { created: number; failed: number };
}>) {
  const t = useTranslations("import.history");
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium capitalize">
          {entity.toLowerCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-sm">
            {counts.created} {t("detail.created").toLowerCase()}
          </span>
        </div>
        {counts.failed > 0 && (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-sm">
              {counts.failed} {t("detail.failed").toLowerCase()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Maps import type to a readable badge variant */
function getTypeBadgeVariant(
  importType: string
): "default" | "secondary" | "outline" {
  switch (importType) {
    case "CLIENTS":
      return "default";
    case "PROPERTIES":
      return "secondary";
    case "MANDATES":
      return "outline";
    default:
      return "default";
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImportDetailClient({ record }: Readonly<ImportDetailClientProps>) {
  const t = useTranslations("import.history");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();

  // ---- Delete dialog state ----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [impactError, setImpactError] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<EntityType>>(
    new Set(ALL_ENTITY_TYPES)
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = format.dateTime(new Date(record.createdAt), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ---- Status helpers ----
  const isPartiallyDeleted = record.status === "PARTIALLY_DELETED";
  const isBatchDeleted = record.status === "BATCH_DELETED";

  // ---- Result details parsing ----
  const typedDetails = isTypedResultDetails(record.resultDetails)
    ? record.resultDetails
    : null;

  const legacyBreakdown = (() => {
    if (typedDetails) return null;
    const rd = record.resultDetails;
    if (rd !== null && typeof rd === "object" && "entityBreakdown" in rd) {
      return (rd as { entityBreakdown: Record<string, { created: number; failed: number }> })
        .entityBreakdown;
    }
    return null;
  })();

  const errors = Array.isArray(record.errorDetails)
    ? record.errorDetails
    : null;

  // ---- Impact scan ----
  async function fetchImpact(entities: "all" | EntityType[]) {
    setImpactLoading(true);
    setImpactError(false);
    setImpactData(null);
    try {
      const response = await fetch(
        `/api/import/history/${record.id}/impact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entities }),
        }
      );
      if (!response.ok) throw new Error("Impact scan failed");
      const data: ImpactData = await response.json();
      setImpactData(data);
    } catch {
      setImpactError(true);
    } finally {
      setImpactLoading(false);
    }
  }

  function openDeleteDialog() {
    setSelectedEntities(new Set(ALL_ENTITY_TYPES));
    setImpactData(null);
    setImpactError(false);
    setDeleteOpen(true);
    fetchImpact("all");
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeleteOpen(false);
    setImpactData(null);
    setImpactError(false);
  }

  function handleEntityToggle(entity: EntityType, checked: boolean) {
    const next = new Set(selectedEntities);
    if (checked) {
      next.add(entity);
    } else {
      next.delete(entity);
    }
    setSelectedEntities(next);

    const entityList = ALL_ENTITY_TYPES.filter((e) => next.has(e));
    if (entityList.length > 0) {
      fetchImpact(entityList);
    } else {
      setImpactData(null);
    }
  }

  async function handleDelete(entities: "all" | EntityType[]) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/import/history/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast.success(t("batchDelete.success"), { isTranslationKey: false });
      router.push("/app/import");
    } catch {
      toast.error(t("batchDelete.error"), { isTranslationKey: false });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  const selectiveEntityList = ALL_ENTITY_TYPES.filter((e) =>
    selectedEntities.has(e)
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/app/import">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("detail.back")}
        </Button>
      </Link>

      {/* PARTIALLY_DELETED warning banner */}
      {isPartiallyDeleted && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle
            className="h-5 w-5 text-warning mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("detail.partiallyDeletedTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("detail.partiallyDeletedDescription")}
            </p>
          </div>
        </div>
      )}

      {/* BATCH_DELETED info banner */}
      {isBatchDeleted && (
        <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-4">
          <Trash2
            className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("detail.batchDeletedTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("detail.batchDeletedDescription")}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {record.sourceFilename}
          </h1>
          <p className="text-muted-foreground text-sm">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={STATUS_VARIANT[record.status] ?? "default"}
            className={
              isPartiallyDeleted
                ? "border-warning text-warning"
                : ""
            }
          >
            {isPartiallyDeleted
              ? t("detail.statusPartiallyDeleted")
              : t(`status.${record.status}` as Parameters<typeof t>[0])}
          </Badge>
          <Badge
            variant="secondary"
            className={TYPE_CLASSES[record.importType] ?? ""}
          >
            {t(`type.${record.importType}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("detail.created")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{record.createdCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("detail.reused")}
            </CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{record.reusedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("detail.failed")}
            </CardTitle>
            <XCircle
              className={`h-4 w-4 ${record.failedCount > 0 ? "text-red-500" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{record.failedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("detail.skipped")}
            </CardTitle>
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{record.skippedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Typed entity breakdown (new format) */}
      {typedDetails && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {t("detail.entityBreakdown")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ALL_ENTITY_TYPES.map((entityType) => {
              const entries = typedDetails[entityType] ?? [];
              const hasEntries = entries.length > 0;
              // Explicitly present in resultDetails means this type was part of the import
              const presentInDetails = entityType in typedDetails;

              // For BATCH_DELETED: show all types that were originally present
              // For PARTIALLY_DELETED: show types that either still have entries OR were
              //   explicitly cleared (key exists but array is empty)
              // For normal records: only show types with actual entries
              const shouldShow =
                hasEntries ||
                (isBatchDeleted && presentInDetails) ||
                (isPartiallyDeleted && presentInDetails);

              if (!shouldShow) return null;

              const entityDeleted =
                isBatchDeleted ||
                (isPartiallyDeleted && !hasEntries);

              return (
                <TypedEntityCard
                  key={entityType}
                  entityType={entityType}
                  entries={entries}
                  isDeleted={entityDeleted}
                />
              );
            })}
          </div>

          {/* Link counts */}
          {typedDetails.linkCounts &&
            Object.values(typedDetails.linkCounts).some((v) => (v ?? 0) > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t("detail.linkCounts")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  {((typedDetails.linkCounts.contactProperty ?? typedDetails.linkCounts.clientProperty ?? 0)) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {typedDetails.linkCounts.contactProperty ?? typedDetails.linkCounts.clientProperty}
                      </span>
                      {t("detail.contactPropertyLinks")}
                    </div>
                  )}
                  {((typedDetails.linkCounts.requestProperty ?? typedDetails.linkCounts.mandateProperty ?? 0)) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {typedDetails.linkCounts.requestProperty ?? typedDetails.linkCounts.mandateProperty}
                      </span>
                      {t("detail.requestPropertyLinks")}
                    </div>
                  )}
                  {((typedDetails.linkCounts.requestContact ?? typedDetails.linkCounts.mandateClient ?? 0)) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {typedDetails.linkCounts.requestContact ?? typedDetails.linkCounts.mandateClient}
                      </span>
                      {t("detail.requestContactLinks")}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Legacy entity breakdown (old format fallback) */}
      {legacyBreakdown && Object.keys(legacyBreakdown).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">
            {t("detail.entityBreakdown")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(legacyBreakdown).map(([entity, counts]) => (
              <LegacyEntityCard key={entity} entity={entity} counts={counts} />
            ))}
          </div>
        </div>
      )}

      {/* Error table */}
      {errors && errors.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("detail.errors")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">
                    {t("detail.errorRow")}
                  </TableHead>
                  <TableHead>{t("detail.errorField")}</TableHead>
                  <TableHead>{t("detail.errorMessage")}</TableHead>
                  <TableHead>{t("detail.errorValue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err, index) => (
                  <TableRow
                    key={`${err.row}-${err.field}-${index}`}
                    className={index % 2 === 0 ? "bg-muted/50" : ""}
                  >
                    <TableCell className="font-mono text-sm">
                      {err.row}
                    </TableCell>
                    <TableCell className="font-medium">{err.field}</TableCell>
                    <TableCell className="text-destructive text-sm">
                      {err.error}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                      {err.value ?? "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete batch button — only show if not already fully deleted */}
      {!isBatchDeleted && (
        <div className="border-t pt-6">
          <Button
            variant="destructive"
            className="gap-2"
            disabled={isDeleting}
            onClick={openDeleteDialog}
          >
            <Trash2 className="h-4 w-4" />
            {t("batchDelete.title")}
          </Button>
        </div>
      )}

      {/* Delete dialog (impact scan + selective delete, matches ImportHistoryClient) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
              {t("batchDelete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("batchDelete.description", { filename: record.sourceFilename })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Tabs defaultValue="full" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="full" className="flex-1">
                {t("batchDelete.fullTab")}
              </TabsTrigger>
              <TabsTrigger value="selective" className="flex-1">
                {t("batchDelete.selectiveTab")}
              </TabsTrigger>
            </TabsList>

            {/* Full Delete Tab */}
            <TabsContent value="full" className="mt-4 space-y-4">
              <ImpactSection
                impactLoading={impactLoading}
                impactError={impactError}
                impactData={impactData}
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  {t("batchDelete.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete("all")}
                  disabled={isDeleting || impactLoading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t("batchDelete.deleting") : t("batchDelete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </TabsContent>

            {/* Selective Delete Tab */}
            <TabsContent value="selective" className="mt-4 space-y-4">
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {t("batchDelete.chooseEntities")}
                </p>
                <div className="space-y-2">
                  {ALL_ENTITY_TYPES.map((entity) => (
                    <label
                      key={entity}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors"
                    >
                      <Checkbox
                        id={`entity-${entity}`}
                        checked={selectedEntities.has(entity)}
                        onCheckedChange={(checked) =>
                          handleEntityToggle(entity, checked === true)
                        }
                        disabled={isDeleting}
                      />
                      <span className="text-sm font-medium">
                        {t(`detail.${entity}` as Parameters<typeof t>[0])}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {selectiveEntityList.length > 0 ? (
                <ImpactSection
                  impactLoading={impactLoading}
                  impactError={impactError}
                  impactData={impactData}
                />
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  {t("batchDelete.selectAtLeast")}
                </p>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  {t("batchDelete.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(selectiveEntityList)}
                  disabled={
                    isDeleting ||
                    impactLoading ||
                    selectiveEntityList.length === 0
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t("batchDelete.deleting") : t("batchDelete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </TabsContent>
          </Tabs>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
