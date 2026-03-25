"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, MoreHorizontal, Eye, Trash2 } from "lucide-react";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  PARTIALLY_FAILED: "outline",
  FAILED: "destructive",
  BATCH_DELETED: "secondary",
};

const TYPE_CLASSES: Record<string, string> = {
  CLIENTS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROPERTIES: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MANDATES: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  UNIFIED: "bg-primary/10 text-primary",
};

export function ImportHistoryClient({ imports }: Readonly<ImportHistoryClientProps>) {
  const t = useTranslations("import.history");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useAppToast();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/import/history/${deleteId}`, {
        method: "DELETE",
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
      setDeleteId(null);
    }
  }

  if (imports.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-end mb-6">
          <Button asChild>
            <Link href="/app/crm/import">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("page.startImport")}
            </Link>
          </Button>
        </div>
        <EmptyState
          title={t("page.emptyState")}
          action={{
            label: t("page.emptyStateAction"),
            onClick: () => router.push("/app/crm/import"),
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Button asChild>
          <Link href="/app/crm/import">
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
              <TableRow key={imp.id}>
                <TableCell className="whitespace-nowrap">
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
                  <span className="text-green-600 dark:text-green-400 font-medium">
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
                  <Badge variant={STATUS_VARIANT[imp.status] ?? "default"}>
                    {t(`status.${imp.status}` as Parameters<typeof t>[0])}
                  </Badge>
                </TableCell>
                <TableCell>
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
                        onClick={() => setDeleteId(imp.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batchDelete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batchDelete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("batchDelete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("batchDelete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
