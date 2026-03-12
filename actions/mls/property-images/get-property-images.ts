"use server";

import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";

export async function getPropertyImages(propertyId: string) {
  const { orgId } = await auth();
  if (!orgId) return [];

  const images = await prismadb.propertyImage.findMany({
    where: { propertyId, organizationId: orgId },
    orderBy: { position: "asc" },
  });

  return JSON.parse(JSON.stringify(images));
}

export async function getSessionImages(uploadSessionId: string) {
  const { orgId } = await auth();
  if (!orgId) return [];

  const images = await prismadb.propertyImage.findMany({
    where: { uploadSessionId, organizationId: orgId },
    orderBy: { position: "asc" },
  });

  return JSON.parse(JSON.stringify(images));
}
