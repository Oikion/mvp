"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  entityType: "client" | "property" | "mandate";
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
  let entityLabel: string;
  if (entityType === "client") {
    entityLabel = "clients";
  } else if (entityType === "mandate") {
    entityLabel = "mandates";
  } else {
    entityLabel = "properties";
  }
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

      {/* Per-entity breakdown (unified import) */}
      {result && (result.clients || result.properties || result.mandates) && (
        <div className="space-y-3">
          {result.clients && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clients</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{result.clients.created} created</span>
                    {result.clients.reused > 0 && <span className="text-muted-foreground">{result.clients.reused} reused</span>}
                    {result.clients.failed > 0 && <span className="text-destructive">{result.clients.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.properties && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Properties</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{result.properties.created} created</span>
                    {result.properties.failed > 0 && <span className="text-destructive">{result.properties.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.mandates && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mandates</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{result.mandates.created} created</span>
                    {result.mandates.failed > 0 && <span className="text-destructive">{result.mandates.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.links && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Links established</span>
                  <span className="text-sm text-muted-foreground">
                    {result.links.clientProperty + result.links.mandateClient + result.links.mandateProperty} total
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Skipped rows notice */}
      {result && result.skipped > 0 && (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            {result.skipped} row(s) already existed and were skipped.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        {viewUrl && hasImported && (
          <Button asChild>
            <Link href={viewUrl} className="inline-flex items-center gap-2 whitespace-nowrap">
              {dict.viewImported.replace("{entity}", entityLabel)}
              <ExternalLink className="h-4 w-4 shrink-0" />
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








