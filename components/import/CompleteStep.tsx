"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ImportResult } from "./ImportWizardSteps";

interface CompleteStepProps {
  dict: {
    successTitle: string;
    successDescription: string;
    imported: string;
    skipped: string;
    failed: string;
    viewImported: string;
    importMore: string;
    done: string;
  };
  result: ImportResult | null;
  entityType: "client" | "property";
  viewUrl?: string;
  onImportMore: () => void;
  onDone?: () => void;
}

export function CompleteStep({
  dict,
  result,
  entityType,
  viewUrl,
  onImportMore,
  onDone,
}: CompleteStepProps) {
  const entityLabel = entityType === "client" ? "clients" : "properties";
  const hasImported = result && result.imported > 0;
  const hasFailed = result && result.failed > 0;

  return (
    <div className="space-y-6">
      {/* Success/Failure Header */}
      <Card
        className={
          hasImported
            ? "border-success/30 bg-success/10"
            : "border-destructive/30 bg-destructive/10"
        }
      >
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            {hasImported ? (
              <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">
              {hasImported
                ? dict.successTitle
                : "Import Failed"}
            </h2>
            <p className="text-muted-foreground">
              {hasImported
                ? dict.successDescription.replace("{entity}", entityLabel)
                : "No records were imported. Please check your data and try again."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Result Stats */}
      {result && (
        <div className="grid grid-cols-3 gap-4">
          <Card className={result.imported > 0 ? "border-success/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/15">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">
                    {result.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">{dict.imported}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={result.skipped > 0 ? "border-warning/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/15">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">{dict.skipped}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={result.failed > 0 ? "border-destructive/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/15">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">{dict.failed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        {viewUrl && hasImported && (
          <Button asChild>
            <Link href={viewUrl}>
              {dict.viewImported.replace("{entity}", entityLabel)}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
        <Button variant="outline" onClick={onImportMore}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {dict.importMore}
        </Button>
        {onDone && (
          <Button variant="ghost" onClick={onDone}>
            {dict.done}
          </Button>
        )}
      </div>
    </div>
  );
}








