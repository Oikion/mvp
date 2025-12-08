"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";
import { toast } from "sonner";
import fetcher, { FetchError } from "@/lib/fetcher";

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
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
        // Retry on error (except 4xx errors)
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          // Don't retry on 4xx errors
          if (error instanceof FetchError && error.status >= 400 && error.status < 500) {
            return;
          }

          // Only retry up to 3 times
          if (retryCount >= 3) {
            return;
          }

          // Retry after 5 seconds
          setTimeout(() => revalidate({ retryCount }), 5000);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
