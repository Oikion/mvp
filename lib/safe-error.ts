/**
 * Utilities for safely handling `unknown` errors in catch blocks.
 *
 * TypeScript 4+ types caught values as `unknown`. Use these helpers to
 * extract a usable Error object or message without unsafe casting.
 *
 * Example:
 *   try { ... } catch (err) {
 *     logger.error("TAG", toError(err));
 *     return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
 *   }
 */

export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

export function errorMessage(err: unknown): string {
  return toError(err).message;
}
