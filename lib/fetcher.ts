/**
 * Enhanced SWR Fetcher with error handling and TypeScript support
 */

export class FetchError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.info = info;
  }
}

/**
 * Type-safe fetcher for SWR
 * - Handles HTTP errors (throws on non-2xx)
 * - Parses error messages from API responses
 * - Supports typed responses
 */
async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    // Try to parse error message from response
    let errorInfo: unknown;
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      errorInfo = await res.json();
      if (typeof errorInfo === "object" && errorInfo !== null) {
        const info = errorInfo as Record<string, unknown>;
        if (typeof info.error === "string") {
          errorMessage = info.error;
        } else if (typeof info.message === "string") {
          errorMessage = info.message;
        }
      }
    } catch {
      // Response is not JSON, use status text
      errorMessage = res.statusText || errorMessage;
    }

    throw new FetchError(errorMessage, res.status, errorInfo);
  }

  return res.json();
}

/**
 * POST fetcher for SWR mutations
 */
export async function postFetcher<T = unknown, D = unknown>(
  url: string,
  { arg }: { arg: D }
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    let errorInfo: unknown;
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      errorInfo = await res.json();
      if (typeof errorInfo === "object" && errorInfo !== null) {
        const info = errorInfo as Record<string, unknown>;
        if (typeof info.error === "string") {
          errorMessage = info.error;
        } else if (typeof info.message === "string") {
          errorMessage = info.message;
        }
      }
    } catch {
      errorMessage = res.statusText || errorMessage;
    }

    throw new FetchError(errorMessage, res.status, errorInfo);
  }

  return res.json();
}

/**
 * PUT fetcher for SWR mutations
 */
export async function putFetcher<T = unknown, D = unknown>(
  url: string,
  { arg }: { arg: D }
): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    let errorInfo: unknown;
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      errorInfo = await res.json();
      if (typeof errorInfo === "object" && errorInfo !== null) {
        const info = errorInfo as Record<string, unknown>;
        if (typeof info.error === "string") {
          errorMessage = info.error;
        } else if (typeof info.message === "string") {
          errorMessage = info.message;
        }
      }
    } catch {
      errorMessage = res.statusText || errorMessage;
    }

    throw new FetchError(errorMessage, res.status, errorInfo);
  }

  return res.json();
}

/**
 * DELETE fetcher for SWR mutations
 */
export async function deleteFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
  });

  if (!res.ok) {
    let errorInfo: unknown;
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      errorInfo = await res.json();
      if (typeof errorInfo === "object" && errorInfo !== null) {
        const info = errorInfo as Record<string, unknown>;
        if (typeof info.error === "string") {
          errorMessage = info.error;
        } else if (typeof info.message === "string") {
          errorMessage = info.message;
        }
      }
    } catch {
      errorMessage = res.statusText || errorMessage;
    }

    throw new FetchError(errorMessage, res.status, errorInfo);
  }

  // Some DELETE endpoints return empty response
  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

export default fetcher;
