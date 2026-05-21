"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reseedAllDemoOrgs } from "@/actions/platform-admin/reseed-demo-orgs";

export function DemoReseedCard() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleReseed() {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      try {
        const result = await reseedAllDemoOrgs();
        setSummary({ total: result.total, succeeded: result.succeeded, failed: result.failed });
      } catch (err) {
        setError(String(err));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-5 w-5 text-muted-foreground" />
          Reseed Demo Orgs
        </CardTitle>
        <CardDescription>
          Bring all existing demo organisations up to the current full seed dataset (20 contacts,
          18 properties, 6 requests, 30 calendar events, 2 channels). Idempotent — safe to run
          multiple times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleReseed} disabled={isPending} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Reseeding…" : "Run Reseed"}
        </Button>

        {summary && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Done — {summary.succeeded}/{summary.total} orgs updated
            {summary.failed > 0 && (
              <span className="text-warning ml-1">({summary.failed} failed — check server logs)</span>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
