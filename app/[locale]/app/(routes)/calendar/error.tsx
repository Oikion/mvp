"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CALENDAR_ERROR]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-lg font-medium">Failed to load calendar</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
