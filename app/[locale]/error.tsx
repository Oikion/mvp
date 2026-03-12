"use client";

/**
 * Locale Error Boundary
 * Catches errors in page components within this locale segment
 * Provides a user-friendly error UI with recovery options
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, LayoutDashboard, Globe, Bug, Heart } from "lucide-react";
import FeedbackSheet from "@/app/[locale]/app/(routes)/components/FeedbackSheet";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    console.error("[LOCALE_ERROR]", error);
  }, [error]);

  const errorId = error.digest;
  const initialFeedback = errorId
    ? `I encountered an error on this page.\n\nError ID: ${errorId}\n\nWhat I was doing:\n`
    : `I encountered an unexpected error on this page.\n\nWhat I was doing:\n`;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-lg w-full space-y-6">

          {/* Error icon + heading */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              We encountered an unexpected error while loading this page.
              Please try again or use one of the options below.
            </p>
            {errorId && (
              <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded inline-block">
                Error ID: {errorId}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild size="lg">
                <a href="/app" className="inline-flex items-center justify-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Back to Dashboard
                </a>
              </Button>
              <Button variant="outline" asChild size="lg">
                <a href="/" className="inline-flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" />
                  Back to Website
                </a>
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => setFeedbackOpen(true)}
            >
              <Bug className="w-4 h-4 mr-2" />
              Create a Bug Report
            </Button>
          </div>

          {/* Beta notice card */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Heart className="w-4 h-4 text-destructive flex-shrink-0" />
              You&apos;re helping build something great
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Oikion is an early-access platform, actively being developed for Greek real estate professionals.
              We know unexpected errors are frustrating — your continued use and feedback are what allow us
              to build the best platform for real estate agents. Thank you for your patience and support.
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            If this error persists, please use the bug report button above with the Error ID.
          </p>
        </div>
      </div>

      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialFeedbackType="bug"
        initialFeedback={initialFeedback}
      />
    </>
  );
}
