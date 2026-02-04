"use client";

import * as React from "react";
import { AlertCircle, RefreshCcw, WifiOff, ServerOff, ShieldAlert, FileX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * ErrorState - Standardized error display component
 *
 * Provides consistent error states across the application with
 * support for different error types and retry functionality.
 *
 * @example
 * ```tsx
 * // Basic error
 * <ErrorState title="Failed to load" onRetry={refetch} />
 *
 * // With description
 * <ErrorState
 *   title="Connection failed"
 *   description="Please check your internet connection"
 *   onRetry={refetch}
 * />
 *
 * // Network error variant
 * <ErrorState variant="network" onRetry={refetch} />
 *
 * // Permission error
 * <ErrorState variant="permission" />
 * ```
 */

export type ErrorVariant = "default" | "network" | "server" | "permission" | "notFound";

const errorConfig: Record<
  ErrorVariant,
  { icon: React.ElementType; defaultTitle: string; defaultDescription: string }
> = {
  default: {
    icon: AlertCircle,
    defaultTitle: "Something went wrong",
    defaultDescription: "An unexpected error occurred. Please try again.",
  },
  network: {
    icon: WifiOff,
    defaultTitle: "Connection error",
    defaultDescription: "Please check your internet connection and try again.",
  },
  server: {
    icon: ServerOff,
    defaultTitle: "Server error",
    defaultDescription: "Our servers are having issues. Please try again later.",
  },
  permission: {
    icon: ShieldAlert,
    defaultTitle: "Access denied",
    defaultDescription: "You don't have permission to view this content.",
  },
  notFound: {
    icon: FileX,
    defaultTitle: "Not found",
    defaultDescription: "The requested resource could not be found.",
  },
};

export interface ErrorStateProps {
  /**
   * Error variant determining icon and default messages
   */
  variant?: ErrorVariant;
  /**
   * Error title (overrides variant default)
   */
  title?: string;
  /**
   * Error description (overrides variant default)
   */
  description?: string;
  /**
   * Error object for displaying technical details
   */
  error?: Error | string | null;
  /**
   * Retry callback
   */
  onRetry?: () => void;
  /**
   * Retry button text
   */
  retryText?: string;
  /**
   * Whether retry is in progress
   */
  isRetrying?: boolean;
  /**
   * Additional action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Layout variant
   */
  layout?: "inline" | "card" | "page";
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Whether to show the error state
   */
  show?: boolean;
}

export function ErrorState({
  variant = "default",
  title,
  description,
  error,
  onRetry,
  retryText = "Try again",
  isRetrying = false,
  action,
  layout = "card",
  className,
  show = true,
}: Readonly<ErrorStateProps>) {
  if (!show) return null;

  const config = errorConfig[variant];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  // Extract error message if error object provided
  const errorMessage = error
    ? typeof error === "string"
      ? error
      : error.message
    : null;

  if (layout === "inline") {
    return (
      <Alert variant="destructive" className={className}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{displayTitle}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>{displayDescription}</span>
          {errorMessage && (
            <code className="text-xs bg-destructive/10 px-2 py-1 rounded">
              {errorMessage}
            </code>
          )}
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="w-fit mt-2"
            >
              {isRetrying ? (
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              {retryText}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (layout === "page") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
          className
        )}
      >
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Icon className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{displayTitle}</h2>
        <p className="text-muted-foreground max-w-md mb-4">{displayDescription}</p>
        {errorMessage && (
          <code className="text-xs bg-muted px-3 py-2 rounded mb-4 max-w-md overflow-x-auto">
            {errorMessage}
          </code>
        )}
        <div className="flex gap-3">
          {onRetry && (
            <Button onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              {retryText}
            </Button>
          )}
          {action && (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default card layout
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-lg border bg-card text-center min-h-[200px]",
        className
      )}
      role="alert"
    >
      <div className="rounded-full bg-destructive/10 p-3 mb-3">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold mb-1">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-3">
        {displayDescription}
      </p>
      {errorMessage && (
        <code className="text-xs bg-muted px-2 py-1 rounded mb-3 max-w-full overflow-x-auto">
          {errorMessage}
        </code>
      )}
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? (
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            {retryText}
          </Button>
        )}
        {action && (
          <Button variant="ghost" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * useErrorState - Hook for managing error state
 *
 * @example
 * ```tsx
 * const { error, setError, clearError, hasError } = useErrorState();
 *
 * try {
 *   await fetchData();
 * } catch (e) {
 *   setError(e);
 * }
 *
 * if (hasError) {
 *   return <ErrorState error={error} onRetry={clearError} />;
 * }
 * ```
 */
export function useErrorState() {
  const [error, setError] = React.useState<Error | string | null>(null);

  const clearError = React.useCallback(() => setError(null), []);

  const handleError = React.useCallback((e: unknown) => {
    if (e instanceof Error) {
      setError(e);
    } else if (typeof e === "string") {
      setError(e);
    } else {
      setError(new Error("An unknown error occurred"));
    }
  }, []);

  return {
    error,
    setError: handleError,
    clearError,
    hasError: error !== null,
  };
}

/**
 * ErrorBoundaryFallback - Fallback component for React Error Boundaries
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: {
  error?: Error;
  resetErrorBoundary?: () => void;
}) {
  return (
    <ErrorState
      variant="default"
      title="Something went wrong"
      description="An unexpected error occurred in this component."
      error={error}
      onRetry={resetErrorBoundary}
      layout="page"
    />
  );
}
