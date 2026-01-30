"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";
import { toast } from "sonner";
import fetcher, { FetchError } from "@/lib/fetcher";

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * Calculate exponential backoff delay
 *
 * @param retryCount - The current retry attempt (0-indexed)
 * @param baseDelay - Base delay in ms (default: 1000ms)
 * @param maxDelay - Maximum delay in ms (default: 30000ms / 30s)
 * @returns Delay in milliseconds with jitter
 *
 * Formula: min(baseDelay * 2^retryCount + jitter, maxDelay)
 * - Retry 0: ~1s (1000ms + jitter)
 * - Retry 1: ~2s (2000ms + jitter)
 * - Retry 2: ~4s (4000ms + jitter)
 * - Retry 3: ~8s (8000ms + jitter)
 */
function getExponentialBackoffDelay(
  retryCount: number,
  baseDelay = 1000,
  maxDelay = 30000
): number {
  // Calculate exponential delay: baseDelay * 2^retryCount
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);

  // Add jitter (0-500ms) to prevent thundering herd
  const jitter = Math.random() * 500;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export function SWRProvider({ children }: Readonly<SWRProviderProps>) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Revalidate on window focus
        revalidateOnFocus: true,
        // Dedupe requests within 2 seconds
        dedupingInterval: 2000,
        // Keep previous data while revalidating
        keepPreviousData: true,
        // Global error handler
        onError: (error: Error) => {
          // Don't show toast for 401 errors (handled by auth)
          if (error instanceof FetchError && error.status === 401) {
            return;
          }

          // Don't show toast for 429 rate limit errors (components handle these)
          if (error instanceof FetchError && error.status === 429) {
            return;
          }

          // Log error for debugging
          console.error("SWR Error:", error);

          // Show toast for other errors
          const message =
            error instanceof FetchError
              ? error.message
              : "An error occurred while fetching data";

          toast.error(message);
        },
        // Retry on error with exponential backoff (except 4xx errors)
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          // Don't retry on 4xx client errors (these won't succeed on retry)
          if (error instanceof FetchError && error.status >= 400 && error.status < 500) {
            return;
          }

          // Only retry up to 3 times
          if (retryCount >= 3) {
            return;
          }

          // Calculate delay with exponential backoff
          // Retry 0: ~1s, Retry 1: ~2s, Retry 2: ~4s
          const delay = getExponentialBackoffDelay(retryCount);

          // Log retry attempt for debugging
          console.log(
            `SWR retry ${retryCount + 1}/3 in ${Math.round(delay)}ms`
          );

          // Retry after calculated delay
          setTimeout(() => revalidate({ retryCount }), delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
