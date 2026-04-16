"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Tag } from "lucide-react";
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
    importMore: string;
    done: string;
  };
  result: ImportResult | BatchImportResult | null;
  entityType: "contact" | "property" | "request";
  returnUrl?: string;
  onImportMore: () => void;
  onDone?: () => void;
}

export function CompleteStep({
  dict,
  result,
  entityType,
  returnUrl,
  onImportMore,
  onDone,
}: CompleteStepProps) {
  // Type guard: detect if using new BatchImportResult format
  const isBatchResult = result && "contacts" in result && Array.isArray((result as BatchImportResult).contacts);
  const batchResult = isBatchResult ? (result as BatchImportResult) : null;
  const legacyResult = !isBatchResult ? (result as ImportResult | null) : null;
  let entityLabel: string;
  if (entityType === "contact") {
    entityLabel = "contacts";
  } else if (entityType === "request") {
    entityLabel = "requests";
  } else {
    entityLabel = "properties";
  }
  // Normalize counts from either result type
  const imported = batchResult
    ? batchResult.contacts.length + batchResult.properties.length + batchResult.requests.length
    : (result as ImportResult | null)?.imported ?? 0;
  const skipped = batchResult
    ? batchResult.skippedCount
    : (result as ImportResult | null)?.skipped ?? 0;
  const failed = batchResult
    ? batchResult.errors.length
    : (result as ImportResult | null)?.failed ?? 0;
  const hasImported = imported > 0;
  const hasFailed = failed > 0;

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
          <Card className={imported > 0 ? "border-success/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/15">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">
                    {imported}
                  </p>
                  <p className="text-xs text-muted-foreground">{dict.imported}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={skipped > 0 ? "border-warning/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/15">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">{dict.skipped}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={failed > 0 ? "border-destructive/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/15">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{failed}</p>
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
          {/* Contacts */}
          {batchResult.contacts.length > 0 && (
            <Card className="border-blue-500/50 bg-blue-50/30 dark:bg-blue-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900">
                        <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium">Contacts</span>
                    </div>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                      {batchResult.contacts.length} created
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {batchResult.contacts.slice(0, 5).map((contact) => (
                      <div key={contact.uuid} className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-mono">{contact.friendlyId}</span>
                      </div>
                    ))}
                    {batchResult.contacts.length > 5 && (
                      <div className="text-muted-foreground italic">
                        +{batchResult.contacts.length - 5} more
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
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                      {batchResult.properties.length} created
                    </span>
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

          {/* Requests */}
          {batchResult.requests.length > 0 && (
            <Card className="border-violet-500/50 bg-violet-50/30 dark:bg-violet-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-violet-100 dark:bg-violet-900">
                        <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-sm font-medium">Requests</span>
                    </div>
                    <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">
                      {batchResult.requests.length} created
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {batchResult.requests.slice(0, 5).map((request) => (
                      <div key={request.uuid} className="flex items-center gap-2">
                        <span className="text-violet-600 dark:text-violet-400 font-mono">{request.friendlyId}</span>
                      </div>
                    ))}
                    {batchResult.requests.length > 5 && (
                      <div className="text-muted-foreground italic">
                        +{batchResult.requests.length - 5} more
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
                    <div>Contact→Property: {batchResult.linkCounts.contactProperty}</div>
                    <div>Request→Property: {batchResult.linkCounts.requestProperty}</div>
                    <div>Request→Contact: {batchResult.linkCounts.requestContact}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-entity breakdown — legacy ImportResult format */}
      {legacyResult && (legacyResult.contacts || legacyResult.properties || legacyResult.requests) && (
        <div className="space-y-3">
          {legacyResult.contacts && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contacts</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{legacyResult.contacts.created} created</span>
                    {legacyResult.contacts.reused > 0 && <span className="text-muted-foreground">{legacyResult.contacts.reused} reused</span>}
                    {legacyResult.contacts.failed > 0 && <span className="text-destructive">{legacyResult.contacts.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {legacyResult.properties && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Properties</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{legacyResult.properties.created} created</span>
                    {legacyResult.properties.failed > 0 && <span className="text-destructive">{legacyResult.properties.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {legacyResult.requests && (
            <Card className="border-primary/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Requests</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-success">{legacyResult.requests.created} created</span>
                    {legacyResult.requests.failed > 0 && <span className="text-destructive">{legacyResult.requests.failed} failed</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {legacyResult.links && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Links established</span>
                  <span className="text-sm text-muted-foreground">
                    {legacyResult.links.contactProperty + legacyResult.links.requestContact + legacyResult.links.requestProperty} total
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Skipped rows notice */}
      {result && skipped > 0 && (
        <Alert className="border-warning/30 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            {skipped} row(s) already existed and were skipped.
          </AlertDescription>
        </Alert>
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








