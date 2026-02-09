"use server";

import { z } from "zod";
import { Prisma, ReservedNameStatus, ReservedNameType } from "@prisma/client";
import { prismadb } from "@/lib/prisma";
import { requirePlatformAdmin, logAdminAction } from "@/lib/platform-admin";
import { getNormalizedReservedValue } from "@/lib/reserved-names";

export interface ReservedNameItem {
  id: string;
  type: ReservedNameType;
  value: string;
  normalizedValue: string;
  status: ReservedNameStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetReservedNamesOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: ReservedNameType | "ALL";
  status?: ReservedNameStatus | "ALL";
}

export interface GetReservedNamesResult {
  items: ReservedNameItem[];
  totalCount: number;
  page: number;
  totalPages: number;
}

const reservedNameSchema = z.object({
  type: z.nativeEnum(ReservedNameType),
  value: z.string().min(2).max(100),
  status: z.nativeEnum(ReservedNameStatus).optional(),
  notes: z.string().max(1000).optional(),
});

const updateReservedNameSchema = reservedNameSchema.extend({
  id: z.string().min(1),
});

export async function getReservedNames(
  options: GetReservedNamesOptions = {}
): Promise<GetReservedNamesResult> {
  const admin = await requirePlatformAdmin();

  const {
    page = 1,
    limit = 20,
    search = "",
    type = "ALL",
    status = "ALL",
  } = options;

  try {
    await logAdminAction(admin.clerkId, "VIEW_RESERVED_NAMES", undefined, {
      page,
      search,
      type,
      status,
    });

    const whereConditions: Prisma.ReservedNameWhereInput = {};

    if (type !== "ALL") {
      whereConditions.type = type;
    }

    if (status !== "ALL") {
      whereConditions.status = status;
    }

    if (search) {
      whereConditions.OR = [
        { value: { contains: search, mode: "insensitive" } },
        { normalizedValue: { contains: search.toLowerCase() } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const totalCount = await prismadb.reservedName.count({ where: whereConditions });
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const items = await prismadb.reservedName.findMany({
      where: whereConditions,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    return {
      items,
      totalCount,
      page,
      totalPages,
    };
  } catch (error) {
    console.error("[GET_RESERVED_NAMES]", error);
    throw new Error("Failed to fetch reserved names");
  }
}

export async function createReservedName(
  data: z.infer<typeof reservedNameSchema>
): Promise<{ success: boolean; item?: ReservedNameItem; error?: string }> {
  const admin = await requirePlatformAdmin();
  const validation = reservedNameSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0]?.message };
  }

  const { type, value, status, notes } = validation.data;
  const normalizedValue = getNormalizedReservedValue(type, value);

  if (!normalizedValue) {
    return { success: false, error: "Reserved name value is invalid" };
  }

  try {
    await logAdminAction(admin.clerkId, "CREATE_RESERVED_NAME", undefined, {
      type,
      value: value.substring(0, 100),
    });

    const item = await prismadb.reservedName.create({
      data: {
        id: crypto.randomUUID(),
        type,
        value: value.trim(),
        normalizedValue,
        status: status ?? ReservedNameStatus.ACTIVE,
        notes: notes?.trim() || null,
      },
    });

    return { success: true, item };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "This reserved name already exists" };
    }
    console.error("[CREATE_RESERVED_NAME]", error);
    return { success: false, error: "Failed to create reserved name" };
  }
}

export async function updateReservedName(
  data: z.infer<typeof updateReservedNameSchema>
): Promise<{ success: boolean; item?: ReservedNameItem; error?: string }> {
  const admin = await requirePlatformAdmin();
  const validation = updateReservedNameSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0]?.message };
  }

  const { id, type, value, status, notes } = validation.data;
  const normalizedValue = getNormalizedReservedValue(type, value);

  if (!normalizedValue) {
    return { success: false, error: "Reserved name value is invalid" };
  }

  try {
    await logAdminAction(admin.clerkId, "UPDATE_RESERVED_NAME", id, {
      type,
      value: value.substring(0, 100),
    });

    const item = await prismadb.reservedName.update({
      where: { id },
      data: {
        type,
        value: value.trim(),
        normalizedValue,
        status: status ?? ReservedNameStatus.ACTIVE,
        notes: notes?.trim() || null,
      },
    });

    return { success: true, item };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "This reserved name already exists" };
    }
    console.error("[UPDATE_RESERVED_NAME]", error);
    return { success: false, error: "Failed to update reserved name" };
  }
}

export async function deleteReservedName(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();

  if (!id) {
    return { success: false, error: "Reserved name ID is required" };
  }

  try {
    await logAdminAction(admin.clerkId, "DELETE_RESERVED_NAME", id);
    await prismadb.reservedName.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("[DELETE_RESERVED_NAME]", error);
    return { success: false, error: "Failed to delete reserved name" };
  }
}
