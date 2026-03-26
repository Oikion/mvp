"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Users,
  Building2,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServerValidationErrorRow {
  rowIndex: number;
  entity: string;
  field: string;
  error: string;
  rawValue: unknown;
}

export interface ServerValidationResult {
  validRows: Array<Record<string, unknown>>;
  errorRows: ServerValidationErrorRow[];
  entitySummary: {
    clients: { detected: boolean; total: number; unique: number; deduplicated: number };
    properties: { detected: boolean; total: number; unique: number; deduplicated: number };
    mandates: { detected: boolean; total: number; unique: number; deduplicated: number };
  };
}

interface ValidationStepProps {
  validationResult: ServerValidationResult | null;
  isValidating: boolean;
  skippedRows: Set<number>;
  onSkippedRowsChange: (rows: Set<number>) => void;
  onRevalidate: (updatedRows: Record<string, unknown>[]) => void;
  dict: Record<string, string>;
}

// ─── Entity badge helpers ─────────────────────────────────────────────────────

const ENTITY_BADGE_STYLES: Record<string, string> = {
  client: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  property: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  mandate: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

function EntityBadge({ entity }: { entity: string }) {
  const lower = entity.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        ENTITY_BADGE_STYLES[lower] ?? "bg-muted text-muted-foreground",
      )}
    >
      {entity}
    </span>
  );
}

// ─── Stat card helpers ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
  highlight?: "success" | "destructive";
}

function StatCard({ icon, iconBg, value, label, highlight }: StatCardProps) {
  return (
    <Card
      className={cn(
        highlight === "success" && value > 0 && "border-success/50",
        highlight === "destructive" && value > 0 && "border-destructive/50",
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", iconBg)}>{icon}</div>
          <div>
            <p
              className={cn(
                "text-2xl font-bold",
                highlight === "success" && value > 0 && "text-success",
                highlight === "destructive" && value > 0 && "text-destructive",
              )}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Entity summary card ──────────────────────────────────────────────────────

interface EntitySummaryCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  summary: { detected: boolean; total: number; unique: number; deduplicated: number };
  skippedCount: number;
}

function EntitySummaryCard({
  icon,
  iconBg,
  iconColor,
  label,
  summary,
  skippedCount,
}: EntitySummaryCardProps) {
  if (!summary.detected) return null;

  const willCreate = summary.unique - skippedCount;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full mt-0.5 shrink-0", iconBg)}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {willCreate} {label.toLowerCase()} will be created
              {skippedCount > 0 && (
                <span className="text-warning"> ({skippedCount} rows skipped)</span>
              )}
            </p>
            {summary.deduplicated > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.unique} unique from {summary.total} rows ({summary.deduplicated} deduplicated)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ValidationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ValidationStep({
  validationResult,
  isValidating,
  skippedRows,
  onSkippedRowsChange,
  onRevalidate,
  dict,
}: ValidationStepProps) {
  // Local edits: rowIndex → field → edited string value
  const [rowEdits, setRowEdits] = useState<Record<number, Record<string, string>>>({});
  const [hasEdits, setHasEdits] = useState(false);

  const handleToggleSkip = useCallback(
    (rowIndex: number) => {
      const next = new Set(skippedRows);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      onSkippedRowsChange(next);
    },
    [skippedRows, onSkippedRowsChange],
  );

  const handleEditValue = useCallback(
    (rowIndex: number, field: string, value: string) => {
      setRowEdits((prev) => ({
        ...prev,
        [rowIndex]: {
          ...(prev[rowIndex] ?? {}),
          [field]: value,
        },
      }));
      setHasEdits(true);
    },
    [],
  );

  const handleRevalidate = useCallback(() => {
    if (!validationResult) return;

    // Merge edits back into validRows for re-submission
    const updatedRows = validationResult.validRows.map((row) => ({ ...row }));

    // Apply edits to error rows and include them too
    const errorRowsByIndex = new Map<number, ServerValidationErrorRow[]>();
    for (const errRow of validationResult.errorRows) {
      const list = errorRowsByIndex.get(errRow.rowIndex) ?? [];
      list.push(errRow);
      errorRowsByIndex.set(errRow.rowIndex, list);
    }

    // Build updated rows from error rows with edits applied
    errorRowsByIndex.forEach((errRows, rowIndex) => {
      if (skippedRows.has(rowIndex)) return;
      const base: Record<string, unknown> = {};
      for (const er of errRows) {
        base[er.field] = er.rawValue;
      }
      const edits = rowEdits[rowIndex] ?? {};
      const merged = { ...base, ...edits };
      updatedRows.push(merged);
    });

    onRevalidate(updatedRows);
    setHasEdits(false);
  }, [validationResult, rowEdits, skippedRows, onRevalidate]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isValidating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{dict.validating ?? "Validating your data…"}</span>
        </div>
        <ValidationSkeleton />
      </div>
    );
  }

  // ── No result yet ────────────────────────────────────────────────────────────
  if (!validationResult) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Info className="h-4 w-4 mr-2" aria-hidden="true" />
        {dict.noData ?? "No validation data available."}
      </div>
    );
  }

  const { validRows, errorRows, entitySummary } = validationResult;

  const totalCount = validRows.length + errorRows.length;
  const validCount = validRows.length;
  const invalidCount = errorRows.length;
  const hasErrors = invalidCount > 0;

  // Count skipped per entity for the entity summary cards
  const skippedByEntity = { clients: 0, properties: 0, mandates: 0 };
  Array.from(skippedRows).forEach((rowIndex) => {
    const firstErr = errorRows.find((e) => e.rowIndex === rowIndex);
    if (!firstErr) return;
    const entity = firstErr.entity.toLowerCase();
    if (entity === "client") skippedByEntity.clients++;
    else if (entity === "property") skippedByEntity.properties++;
    else if (entity === "mandate") skippedByEntity.mandates++;
  });

  return (
    <div className="space-y-6">
      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          iconBg="bg-muted"
          value={totalCount}
          label={dict.totalRows ?? "Total rows"}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />}
          iconBg="bg-success/15"
          value={validCount}
          label={dict.validRows ?? "Valid rows"}
          highlight="success"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />}
          iconBg="bg-destructive/15"
          value={invalidCount}
          label={dict.invalidRows ?? "Invalid rows"}
          highlight="destructive"
        />
      </div>

      {/* ── Status alert ── */}
      {!hasErrors ? (
        <Alert className="border-success/30 bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          <AlertDescription className="text-success dark:text-success">
            {dict.noErrors ?? "All rows passed validation. Ready to import."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <AlertDescription className="text-warning dark:text-warning">
            {(dict.hasErrors ?? "{count} rows have errors.")
              .replace("{count}", String(invalidCount))}
            <span className="block text-xs mt-1 opacity-80">
              {dict.fixHint ?? "Edit values inline or skip rows to proceed."}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Entity summary cards ── */}
      {(entitySummary.clients.detected ||
        entitySummary.properties.detected ||
        entitySummary.mandates.detected) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <EntitySummaryCard
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-700 dark:text-blue-300"
            label="Clients"
            summary={entitySummary.clients}
            skippedCount={skippedByEntity.clients}
          />
          <EntitySummaryCard
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-700 dark:text-green-300"
            label="Properties"
            summary={entitySummary.properties}
            skippedCount={skippedByEntity.properties}
          />
          <EntitySummaryCard
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-700 dark:text-violet-300"
            label="Mandates"
            summary={entitySummary.mandates}
            skippedCount={skippedByEntity.mandates}
          />
        </div>
      )}

      {/* ── Error rows table ── */}
      {hasErrors && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                {dict.errorDetails ?? "Error Details"}
              </CardTitle>
              {hasEdits && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevalidate}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {dict.revalidate ?? "Re-validate"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Skip toggle */}
                    <TableHead className="w-[40px] pl-4">
                      <span className="sr-only">Skip row</span>
                    </TableHead>
                    <TableHead className="w-[70px]">
                      {dict.row ?? "Row #"}
                    </TableHead>
                    <TableHead className="w-[100px]">Entity</TableHead>
                    <TableHead className="w-[120px]">
                      {dict.field ?? "Field"}
                    </TableHead>
                    <TableHead className="w-[180px]">
                      {dict.value ?? "Current Value"}
                    </TableHead>
                    <TableHead>
                      {dict.error ?? "Error Message"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorRows.slice(0, 100).map((errRow, idx) => {
                    const isSkipped = skippedRows.has(errRow.rowIndex);
                    const editedValue =
                      rowEdits[errRow.rowIndex]?.[errRow.field] ??
                      String(errRow.rawValue ?? "");

                    return (
                      <TableRow
                        key={`${errRow.rowIndex}-${errRow.field}-${idx}`}
                        className={cn(isSkipped && "opacity-50 bg-muted/30")}
                        aria-disabled={isSkipped}
                      >
                        {/* Skip checkbox */}
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={!isSkipped}
                            onCheckedChange={() => handleToggleSkip(errRow.rowIndex)}
                            aria-label={`${isSkipped ? "Include" : "Skip"} row ${errRow.rowIndex}`}
                          />
                        </TableCell>

                        {/* Row number */}
                        <TableCell>
                          <Badge variant="outline">{errRow.rowIndex}</Badge>
                        </TableCell>

                        {/* Entity badge */}
                        <TableCell>
                          <EntityBadge entity={errRow.entity} />
                        </TableCell>

                        {/* Field name */}
                        <TableCell className="font-medium text-sm">
                          {errRow.field || "—"}
                        </TableCell>

                        {/* Editable current value */}
                        <TableCell>
                          <Input
                            value={editedValue}
                            onChange={(e) =>
                              handleEditValue(errRow.rowIndex, errRow.field, e.target.value)
                            }
                            disabled={isSkipped}
                            className="h-7 text-sm px-2 min-w-[120px]"
                            aria-label={`Edit value for ${errRow.field} on row ${errRow.rowIndex}`}
                          />
                        </TableCell>

                        {/* Error message */}
                        <TableCell className="text-destructive text-sm">
                          {errRow.error}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {errorRows.length > 100 && (
              <div className="p-3 text-center text-sm text-muted-foreground border-t">
                {`… and ${errorRows.length - 100} more errors`}
              </div>
            )}

            {/* Re-validate footer button when there are edits */}
            {hasEdits && (
              <div className="p-3 border-t flex justify-end">
                <Button
                  size="sm"
                  onClick={handleRevalidate}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {dict.revalidate ?? "Re-validate edited rows"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
