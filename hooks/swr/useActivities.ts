"use client";

import useSWR from "swr";
import fetcher from "@/lib/fetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityKind =
  | "EMAIL"
  | "CALL"
  | "MEETING"
  | "NOTE"
  | "TASK"
  | "SHOWING"
  | "DOCUMENT"
  | "OTHER";

export type ActivityDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

export type ActivityParentType =
  | "CONTACT"
  | "REQUEST"
  | "DEAL"
  | "PROPERTY"
  | "SHOWING";

export interface ActivityUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

export interface Activity {
  id: string;
  organizationId: string;
  parentType: ActivityParentType;
  parentId: string;
  kind: ActivityKind;
  direction: ActivityDirection;
  subject: string | null;
  body: string | null;
  durationMin: number | null;
  outcome: string | null;
  scheduledAt: string | null;
  occurredAt: string;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  CreatedBy: ActivityUser | null;
  AssignedTo: ActivityUser | null;
}

interface ActivitiesResponse {
  data: Activity[];
}

export interface UseActivitiesOptions {
  parentType: ActivityParentType;
  parentId: string | null;
  enabled?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches activities for a given parent entity (contact, request, deal, etc.).
 * Returns an empty array when `parentId` is null or `enabled` is false.
 */
export function useActivities({
  parentType,
  parentId,
  enabled = true,
}: UseActivitiesOptions) {
  const key =
    enabled && parentId
      ? `/api/activities?parentType=${encodeURIComponent(parentType)}&parentId=${encodeURIComponent(parentId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<ActivitiesResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    activities: data?.data ?? [],
    isLoading,
    error,
    mutate,
    refresh: () => mutate(),
  };
}
