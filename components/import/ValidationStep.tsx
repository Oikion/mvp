"use client";

import { useEffect } from "react";
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
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ValidationError, FieldsDict } from "./ImportWizardSteps";

interface ValidationStepProps {
  dict: {
    validRows: string;
    invalidRows: string;
    totalRows: string;
    noErrors: string;
    hasErrors: string;
    errorDetails: string;
    row: string;
    field: string;
    error: string;
    value: string;
    fixHint: string;
  };
  fieldsDict: FieldsDict;
  errors: ValidationError[];
  validCount: number;
  totalCount: number;
  onValidate: () => { errors: ValidationError[]; valid: Record<string, unknown>[] };
}

export function ValidationStep({
  dict,
  fieldsDict,
  errors,
  validCount,
  totalCount,
  onValidate,
}: ValidationStepProps) {
  // Run validation on mount
  useEffect(() => {
    onValidate();
  }, [onValidate]);

  const invalidCount = totalCount - validCount;
  const hasErrors = errors.length > 0;

  const getFieldLabel = (fieldKey: string) => {
    return fieldsDict.fields[fieldKey] || fieldKey;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">{dict.totalRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={validCount > 0 ? "border-green-500/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/15">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{validCount}</p>
                <p className="text-xs text-muted-foreground">{dict.validRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={invalidCount > 0 ? "border-red-500/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/15">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
                <p className="text-xs text-muted-foreground">{dict.invalidRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Message */}
      {!hasErrors ? (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            {dict.noErrors}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            {dict.hasErrors.replace("{count}", String(invalidCount))}
            <span className="block text-xs mt-1 opacity-80">{dict.fixHint}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Details Table */}
      {hasErrors && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {dict.errorDetails}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">{dict.row}</TableHead>
                    <TableHead className="w-[150px]">{dict.field}</TableHead>
                    <TableHead className="w-[150px]">{dict.value}</TableHead>
                    <TableHead>{dict.error}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.slice(0, 50).map((error, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{error.row}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getFieldLabel(error.field)}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">
                        {error.value || "-"}
                      </TableCell>
                      <TableCell className="text-red-600 text-sm">
                        {error.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.length > 50 && (
              <div className="p-3 text-center text-sm text-muted-foreground border-t">
                ... and {errors.length - 50} more errors
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


