"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, RefreshCw, Tag } from "lucide-react";
import { Link } from "@/navigation";
import type { ImportResult } from "./ImportWizardSteps";
import type { BatchImportResult } from "@/lib/import/unified-engine";

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
  result: ImportResult | BatchImportResult | null;
  entityType: "client" | "property" | "mandate";
  viewUrl?: string;
  returnUrl?: string;
  onImportMore: () => void;
  onDone?: () => void;
}

export function CompleteStep({
  dict,
  result,
  entityType,
  viewUrl,
  returnUrl,
  onImportMore,
  onDone,
}: CompleteStepProps) {
  // Type guard: detect if using new BatchImportResult format
  const isBatchResult = result && "clients" in result && Array.isArray(result.clients);
  const batchResult = isBatchResult ? (result as BatchImportResult) : null;
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

      {/* Per-entity breakdown — new BatchImportResult format with typed entities */}
      {batchResult && (
        <div className="space-y-3">
          {/* Clients */}
          {batchResult.clients.length > 0 && (
            <Card className="border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900">
                        <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium">Clients</span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                        {batchResult.clients.length} created
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link href="/app/crm/clients" className="inline-flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        View Clients
                      </Link>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {batchResult.clients.slice(0, 5).map((client) => (
                      <div key={client.uuid} className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{client.friendlyId}</span>
                      </div>
                    ))}
                    {batchResult.clients.length > 5 && (
                      <div className="text-muted-foreground italic">
                        +{batchResult.clients.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Properties */}
          {batchResult.properties.length > 0 && (
            <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900">
                        <Tag className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-medium">Properties</span>
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        {batchResult.properties.length} created
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link href="/app/mls/properties" className="inline-flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        View Properties
                      </Link>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {batchResult.properties.slice(0, 5).map((prop) => (
                      <div key={prop.uuid} className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400 font-mono">{prop.friendlyId}</span>
                      </div>
                    ))}
                    {batchResult.properties.length > 5 && (
                      <div className="text-muted-foreground italic">
                        +{batchResult.properties.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mandates */}
          {batchResult.mandates.length > 0 && (
            <Card className="border-violet-500/50 bg-violet-50/30 dark:bg-violet-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-violet-100 dark:bg-violet-900">
                        <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-sm font-medium">Mandates</span>
                      <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">
                        {batchResult.mandates.length} created
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link href="/app/mandates" className="inline-flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        View Mandates
                      </Link>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {batchResult.mandates.slice(0, 5).map((mandate) => (
                      <div key={mandate.uuid} className="flex items-center gap-2">
                        <span className="text-violet-600 dark:text-violet-400 font-mono">{mandate.friendlyId}</span>
                      </div>
                    ))}
                    {batchResult.mandates.length > 5 && (
                      <div className="text-muted-foreground italic">
                        +{batchResult.mandates.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links established */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Links established</span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    <div>Client→Property: {batchResult.linkCounts.clientProperty}</div>
                    <div>Mandate→Property: {batchResult.linkCounts.mandateProperty}</div>
                    <div>Mandate→Client: {batchResult.linkCounts.mandateClient}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-entity breakdown — legacy ImportResult format */}
      {result && !batchResult && (result.clients || result.properties || result.mandates) && (
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

      {/* Legacy single-entity view button */}
      {!batchResult && viewUrl && hasImported && (
        <div className="flex justify-center pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href={viewUrl} className="inline-flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              {dict.viewImported.replace("{entity}", entityLabel)}
            </Link>
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button variant="outline" onClick={onImportMore}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {dict.importMore}
        </Button>
        {returnUrl && (
          <Button asChild variant="ghost">
            <Link href={returnUrl}>
              {dict.done}
            </Link>
          </Button>
        )}
        {!returnUrl && onDone && (
          <Button variant="ghost" onClick={onDone}>
            {dict.done}
          </Button>
        )}
      </div>
    </div>
  );
}








