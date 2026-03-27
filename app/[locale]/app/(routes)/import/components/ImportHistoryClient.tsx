"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, MoreHorizontal, Eye, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyState } from "@/components/ui/empty-state";
import { useAppToast } from "@/hooks/use-app-toast";

interface ImportHistoryClientProps {
  imports: Array<{
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
  }>;
}

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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  PARTIALLY_FAILED: "outline",
  FAILED: "destructive",
  BATCH_DELETED: "secondary",
  PARTIALLY_DELETED: "outline",
};

const TYPE_CLASSES: Record<string, string> = {
  CLIENTS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROPERTIES: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MANDATES: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  UNIFIED: "bg-primary/10 text-primary",
};

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const t = useTranslations("import.history");

  if (status === "PARTIALLY_DELETED") {
    return (
      <Badge variant="outline" className="text-warning border-warning">
        {t("status.PARTIALLY_DELETED")}
      </Badge>
    );
  }

  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"}>
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

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
              <span className="font-medium text-destructive">{data.entities.clients}</span>
              <span className="text-muted-foreground">{t("detail.clients")}</span>
            </div>
          )}
          {data.entities.properties > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">{data.entities.properties}</span>
              <span className="text-muted-foreground">{t("detail.properties")}</span>
            </div>
          )}
          {data.entities.mandates > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-destructive">{data.entities.mandates}</span>
              <span className="text-muted-foreground">{t("detail.mandates")}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground italic">{t("batchDelete.noEntities")}</p>
      )}

      {hasCascade && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("batchDelete.alsoRemove")}
          </p>
          {data.cascade.clientPropertyLinks > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.clientPropertyLinks", { count: data.cascade.clientPropertyLinks })}</span>
            </div>
          )}
          {data.cascade.mandatePropertyLinks > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.mandatePropertyLinks", { count: data.cascade.mandatePropertyLinks })}</span>
            </div>
          )}
          {data.cascade.mandateClientLinks > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{"\u2192"}</span>
              <span>{t("batchDelete.mandateClientLinks", { count: data.cascade.mandateClientLinks })}</span>
            </div>
          )}
          {data.cascade.deals > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
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
      <div className="pt-2 space-y-2">
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
      <p className="text-sm text-destructive">
        {t("batchDelete.impactError")}
      </p>
    );
  }
  if (!impactData) return null;
  return (
    <>
      <ImpactReport data={impactData} />
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <AlertTriangle
          className="h-4 w-4 text-destructive mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <p className="text-sm text-destructive font-medium">{t("batchDelete.cannotUndo")}</p>
      </div>
    </>
  );
}

export function ImportHistoryClient({ imports }: Readonly<ImportHistoryClientProps>) {
  const t = useTranslations("import.history");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();

  // Dialog open state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null);

  // Impact scan state
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [impactError, setImpactError] = useState(false);

  // Selective delete state
  const [selectedEntities, setSelectedEntities] = useState<Set<EntityType>>(
    new Set(ALL_ENTITY_TYPES)
  );

  // Execution state
  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchImpact(id: string, entities: "all" | EntityType[]) {
    setImpactLoading(true);
    setImpactError(false);
    setImpactData(null);
    try {
      const response = await fetch(`/api/import/history/${id}/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities }),
      });
      if (!response.ok) throw new Error("Impact scan failed");
      const data: ImpactData = await response.json();
      setImpactData(data);
    } catch {
      setImpactError(true);
    } finally {
      setImpactLoading(false);
    }
  }

  function openDeleteDialog(id: string, filename: string) {
    setDeleteTarget({ id, filename });
    setSelectedEntities(new Set(ALL_ENTITY_TYPES));
    setImpactData(null);
    setImpactError(false);
    fetchImpact(id, "all");
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeleteTarget(null);
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

    if (!deleteTarget) return;
    const entityList = ALL_ENTITY_TYPES.filter((e) => next.has(e));
    if (entityList.length > 0) {
      fetchImpact(deleteTarget.id, entityList);
    } else {
      setImpactData(null);
    }
  }

  async function handleDelete(entities: "all" | EntityType[]) {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/import/history/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast.success(t("batchDelete.success"), { isTranslationKey: false });
      router.refresh();
    } catch {
      toast.error(t("batchDelete.error"), { isTranslationKey: false });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (imports.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-end mb-6">
          <Button asChild>
            <Link href="/app/import/add">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("page.startImport")}
            </Link>
          </Button>
        </div>
        <EmptyState
          title={t("page.emptyState")}
          action={{
            label: t("page.emptyStateAction"),
            onClick: () => router.push("/app/import/add"),
          }}
        />
      </div>
    );
  }

  const selectiveEntityList = ALL_ENTITY_TYPES.filter((e) => selectedEntities.has(e));

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button asChild>
          <Link href="/app/import/add">
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("page.startImport")}
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.date")}</TableHead>
              <TableHead>{t("table.source")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead className="text-right">{t("table.created")}</TableHead>
              <TableHead className="text-right">{t("table.failed")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">{t("table.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <TableRow
                key={imp.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/app/import/${imp.id}`)}
              >
                <TableCell className="whitespace-nowrap" suppressHydrationWarning>
                  {format.dateTime(new Date(imp.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-medium">
                  {imp.sourceFilename}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={TYPE_CLASSES[imp.importType] ?? ""}
                  >
                    {t(`type.${imp.importType}` as Parameters<typeof t>[0])}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-success font-medium">
                    {imp.createdCount}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {imp.failedCount > 0 ? (
                    <span className="text-destructive font-medium">
                      {imp.failedCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={imp.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={t("table.actions")}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/app/import/${imp.id}`}>
                          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                          {t("table.viewDetails")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDeleteDialog(imp.id, imp.sourceFilename)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t("table.deleteBatch")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              {t("batchDelete.title")}
            </AlertDialogTitle>
            {deleteTarget && (
              <AlertDialogDescription>
                {t("batchDelete.description", { filename: deleteTarget.filename })}
              </AlertDialogDescription>
            )}
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
                <p className="text-sm text-muted-foreground">
                  {t("batchDelete.chooseEntities")}
                </p>
                <div className="space-y-2">
                  {ALL_ENTITY_TYPES.map((entity) => (
                    <label
                      key={entity}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`entity-${entity}`}
                        checked={selectedEntities.has(entity)}
                        onCheckedChange={(checked) =>
                          handleEntityToggle(entity, checked === true)
                        }
                        disabled={isDeleting}
                      />
                      <span className="text-sm font-medium">{t(`detail.${entity}` as Parameters<typeof t>[0])}</span>
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
                <p className="text-sm text-muted-foreground italic">
                  {t("batchDelete.selectAtLeast")}
                </p>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  {t("batchDelete.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(selectiveEntityList)}
                  disabled={isDeleting || impactLoading || selectiveEntityList.length === 0}
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
