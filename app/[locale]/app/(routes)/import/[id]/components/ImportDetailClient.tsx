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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "@/navigation";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";

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
  resultDetails: any | null;
  entityIds: string[];
}

interface ImportDetailClientProps {
  record: ImportDetailRecord;
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

export function ImportDetailClient({ record }: ImportDetailClientProps) {
  const t = useTranslations("import.history");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = format.dateTime(new Date(record.createdAt), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleDeleteBatch = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/import/history/${record.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete import batch");
      }

      toast.success("deleteSuccess");
      router.push("/app/import");
    } catch {
      toast.error("deleteFailed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract entity breakdown from resultDetails if available
  const entityBreakdown = record.resultDetails?.entityBreakdown as
    | Record<string, { created: number; failed: number }>
    | undefined;

  const errors = Array.isArray(record.errorDetails)
    ? record.errorDetails
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/app/import">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {record.sourceFilename}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formattedDate}
          </p>
        </div>
        <Badge variant={getTypeBadgeVariant(record.importType)}>
          {record.importType}
        </Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("created")}
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
              {t("reused")}
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
              {t("failed")}
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
              {t("skipped")}
            </CardTitle>
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{record.skippedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Entity breakdown */}
      {entityBreakdown && Object.keys(entityBreakdown).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("entityBreakdown")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(entityBreakdown).map(([entity, counts]) => (
              <Card key={entity}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {entity.toLowerCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-sm">
                      {counts.created} {t("created").toLowerCase()}
                    </span>
                  </div>
                  {counts.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm">
                        {counts.failed} {t("failed").toLowerCase()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error table */}
      {errors && errors.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("errors")}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">{t("errorRow")}</TableHead>
                  <TableHead>{t("errorField")}</TableHead>
                  <TableHead>{t("errorMessage")}</TableHead>
                  <TableHead>{t("errorValue")}</TableHead>
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
                      {err.value ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete batch button */}
      <div className="border-t pt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2" disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
              {t("deleteBatch")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBatch}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t("deleting") : t("confirmDelete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
