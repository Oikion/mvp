/**
 * Shared types for Next.js App Router API route handlers.
 *
 * Next.js 15+ made `params` a Promise in route handler contexts.
 * Use RouteContext to type the second argument of GET/POST/etc. handlers.
 *
 * Example:
 *   export async function GET(
 *     _req: Request,
 *     { params }: RouteContext<{ propertyId: string }>
 *   ) {
 *     const { propertyId } = await params;
 *   }
 */
export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};
