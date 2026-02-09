import type { ReservedNameStatus, ReservedNameType } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { generateOrgSlug } from "@/types/onboarding";

export interface ReservedNameCheck {
  type: ReservedNameType;
  value: string;
}

export function normalizeUsername(value: string): string {
  return value.toLowerCase().trim().replaceAll(/[^\w]/g, "");
}

export function normalizeOrgName(value: string): string {
  return value.toLowerCase().trim().replaceAll(/\s+/g, " ");
}

export function normalizeOrgSlug(value: string): string {
  return generateOrgSlug(value);
}

export function getNormalizedReservedValue(
  type: ReservedNameType,
  value: string
): string {
  switch (type) {
    case "USERNAME":
      return normalizeUsername(value);
    case "ORGANIZATION_NAME":
      return normalizeOrgName(value);
    case "ORGANIZATION_SLUG":
      return normalizeOrgSlug(value);
    default:
      return "";
  }
}

export async function isReservedName({ type, value }: ReservedNameCheck): Promise<boolean> {
  const normalizedValue = getNormalizedReservedValue(type, value);
  if (!normalizedValue) {
    return false;
  }

  const match = await prismadb.reservedName.findFirst({
    where: {
      type,
      normalizedValue,
      status: "ACTIVE" as ReservedNameStatus,
    },
    select: { id: true },
  });

  return !!match;
}
