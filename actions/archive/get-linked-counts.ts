"use server";

import { auth } from "@clerk/nextjs/server";

import type { ArchivableEntityType } from "./archive-entity";

export async function getLinkedCounts(
  entityType: ArchivableEntityType,
  id: string
): Promise<{ data: Record<string, number>; error?: string }> {
  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) return { data: {}, error: "Unauthorized" };

  const res = await fetch(
    `/api/archive/${entityType}/${id}/linked-counts`,
    { cache: "no-store" }
  );

  if (!res.ok) return { data: {}, error: "Failed to fetch linked counts" };
  const json = await res.json();
  return { data: json.data ?? {} };
}
