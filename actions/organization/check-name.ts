"use server";

import { ReservedNameType } from "@prisma/client";

import { isReservedName } from "@/lib/reserved-names";

export interface NameAvailabilityResult {
  available: boolean;
  error?: string;
}

export async function checkOrgNameAvailability(
  name: string
): Promise<NameAvailabilityResult> {
  try {
    if (!name || name.trim().length < 2) {
      return {
        available: false,
        error: "Name must be at least 2 characters",
      };
    }

    if (name.length > 100) {
      return {
        available: false,
        error: "Name must be at most 100 characters",
      };
    }

    const reserved = await isReservedName({
      type: ReservedNameType.ORG_NAME,
      value: name,
    });

    if (reserved) {
      return {
        available: false,
        error: "RESERVED",
      };
    }

    return { available: true };
  } catch {
    return {
      available: false,
      error: "Failed to check name availability",
    };
  }
}
