"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ColumnMapping } from "./ConversionWizard";

interface ConversionPreviewStepProps {
  convertedData: Record<string, unknown>[];
  validRows: number;
  invalidRows: number;
  issues: Array<{ row: number; field: string; message: string }>;
  columnMappings: ColumnMapping[];
}

const ROWS_PER_PAGE = 10;

export function ConversionPreviewStep({
  convertedData,
  validRows,
  invalidRows,
  issues,
  columnMappings,
}: ConversionPreviewStepProps) {
  const t = useTranslations("conversion");
  const [currentPage, setCurrentPage] = useState(0);

  // Get mapped fields (columns to show)
  const mappedFields = useMemo(() => {
    return columnMappings
      .filter(m => m.targetField)
      .map(m => m.targetField);
  }, [columnMappings]);

  // Pagination
  const totalPages = Math.ceil(convertedData.length / ROWS_PER_PAGE);
  const paginatedData = convertedData.slice(
    currentPage * ROWS_PER_PAGE,
    (currentPage + 1) * ROWS_PER_PAGE
  );

  const hasIssues = invalidRows > 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validRows}
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {t("preview.validRows")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${
          hasIssues 
            ? "border-amber-500/30 bg-amber-500/10" 
            : "border-muted"
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${
                hasIssues ? "text-amber-600" : "text-muted-foreground"
              }`} />
              <div>
                <p className={`text-2xl font-bold ${
                  hasIssues ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                }`}>
                  {invalidRows}
                </p>
                <p className={`text-sm ${
                  hasIssues ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
                }`}>
                  {t("preview.invalidRows")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Alert */}
      {hasIssues && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("preview.issues")}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
              {issues.slice(0, 10).map((issue, i) => (
                <li key={i} className="text-sm">
                  Row {issue.row}: {issue.field} - {issue.message}
                </li>
              ))}
              {issues.length > 10 && (
                <li className="text-sm font-medium">
                  ... and {issues.length - 10} more issues
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!hasIssues && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-600 dark:text-green-400">
            {t("preview.noIssues")}
          </AlertTitle>
        </Alert>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t("preview.title")}
              </CardTitle>
              <CardDescription>
                {t("preview.rowsPreview", {
                  shown: Math.min((currentPage + 1) * ROWS_PER_PAGE, convertedData.length),
                  total: convertedData.length,
                })}
              </CardDescription>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {mappedFields.map((field) => (
                    <TableHead key={field} className="whitespace-nowrap">
                      {field}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell className="font-mono text-muted-foreground">
                      {currentPage * ROWS_PER_PAGE + rowIndex + 1}
                    </TableCell>
                    {mappedFields.map((field) => (
                      <TableCell key={field} className="max-w-[200px] truncate">
                        {row[field] !== undefined && row[field] !== null
                          ? String(row[field])
                          : <span className="text-muted-foreground italic">—</span>
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


