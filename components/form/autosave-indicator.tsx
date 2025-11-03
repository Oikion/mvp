"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/ui/icons";

export type AutosaveStatus = "idle" | "saving" | "saved" | "failed";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  className?: string;
  messages?: {
    saving?: string;
    saved?: string;
    failed?: string;
  };
}

export function AutosaveIndicator({
  status,
  className,
  messages = {},
}: AutosaveIndicatorProps) {
  const defaultMessages = {
    saving: "Saving...",
    saved: "Saved",
    failed: "Failed to save",
    ...messages,
  };

  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        status === "saving" && "text-muted-foreground",
        status === "saved" && "text-green-600 dark:text-green-400",
        status === "failed" && "text-destructive",
        className
      )}
    >
      {status === "saving" && (
        <Icons.spinner className="h-3 w-3 animate-spin" />
      )}
      {status === "saved" && (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {status === "failed" && (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span>{defaultMessages[status]}</span>
    </div>
  );
}

