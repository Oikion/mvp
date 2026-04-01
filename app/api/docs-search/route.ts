import { publicSource, privateSource } from "@/lib/docs-source";
import { createFromSource } from "fumadocs-core/search/server";
import { NextRequest } from "next/server";

/**
 * Orama static search for documentation.
 * Supports both public and private doc scopes via ?scope= query param.
 * Public search is the default — private requires the caller to be authenticated
 * (auth is enforced by the private docs layout, not this endpoint).
 */

const publicSearch = createFromSource(publicSource);
const privateSearch = createFromSource(privateSource);

export const revalidate = false; // Static — revalidate at build time only

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "private") {
    return privateSearch.GET(request);
  }

  return publicSearch.GET(request);
}
