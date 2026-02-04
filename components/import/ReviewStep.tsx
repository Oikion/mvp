"use client";

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
import { CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FieldsDict } from "./ImportWizardSteps";

interface ReviewStepProps {
  dict: {
    previewTitle: string;
    previewDescription: string;
    readyToImport: string;
    willSkip: string;
    confirmImport: string;
  };
  fieldsDict: FieldsDict;
  data: Record<string, unknown>[];
  errorCount: number;
  entityType: "client" | "property";
}

export function ReviewStep({
  dict,
  fieldsDict,
  data,
  errorCount,
  entityType,
}: ReviewStepProps) {
  const previewData = data.slice(0, 10);
  const entityLabel = entityType === "client" ? "clients" : "properties";

  // Get the columns to display (first few important fields)
  const displayColumns =
    entityType === "client"
      ? ["client_name", "primary_email", "primary_phone", "client_type", "client_status"]
      : ["property_name", "property_type", "price", "address_city", "property_status"];

  // Filter to only include columns that exist in the data
  const availableColumns = displayColumns.filter((col) =>
    previewData.some((row) => row[col] !== undefined && row[col] !== "")
  );

  const getFieldLabel = (fieldKey: string) => {
    return fieldsDict.fields[fieldKey] || fieldKey;
  };

  const formatValue = (value: unknown): string => {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Ready to Import Summary */}
      <Card className="border-success/30 bg-success/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {dict.readyToImport
                  .replace("{count}", String(data.length))
                  .replace("{entity}", entityLabel)}
              </p>
              <p className="text-sm text-muted-foreground">{dict.confirmImport}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skip Warning */}
      {errorCount > 0 && (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning dark:text-warning">
            {dict.willSkip.replace("{count}", String(errorCount))}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {dict.previewTitle}
            </CardTitle>
            <Badge variant="secondary">
              {dict.previewDescription.replace(
                "{count}",
                String(Math.min(10, data.length))
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {availableColumns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap">
                      {getFieldLabel(col)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {availableColumns.map((col) => (
                      <TableCell key={col} className="truncate max-w-[200px]">
                        {formatValue(row[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.length > 10 && (
            <div className="p-3 text-center text-sm text-muted-foreground border-t">
              ... and {data.length - 10} more {entityLabel}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success">{data.length}</p>
              <p className="text-sm text-muted-foreground">
                {entityType === "client" ? "Clients" : "Properties"} to import
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">
                {availableColumns.length}
              </p>
              <p className="text-sm text-muted-foreground">Fields mapped</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}








