const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

export async function withGoogleRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const code =
        (err as { code?: number; status?: number })?.code ??
        (err as { code?: number; status?: number })?.status;
      if (attempt === maxAttempts - 1 || !RETRYABLE_CODES.has(code ?? 0)) {
        throw err;
      }
      const delay = Math.min(
        200 * Math.pow(2, attempt) + Math.random() * 100,
        8000
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("withGoogleRetry: unreachable");
}
