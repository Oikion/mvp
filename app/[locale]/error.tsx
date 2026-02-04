"use client";

/**
 * Locale Error Boundary
 * Catches errors in page components within this locale segment
 * Provides a user-friendly error UI with recovery options
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[LOCALE_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error while loading this page.
            Please try again or contact support if the problem persists.
          </p>
          {error.digest && (
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1 rounded inline-block">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <Button onClick={() => reset()} className="w-full" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full" size="lg">
            <a href="/" className="inline-flex items-center gap-2">
              <Home className="w-4 h-4" />
              Return to home
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If this error persists, please contact support with the error ID above.
        </p>
      </div>
    </div>
  );
}
