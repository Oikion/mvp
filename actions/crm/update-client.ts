"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { encryptClient } from "@/lib/model-encryption";

export const updateClient = async (clientId: string, data: any) => {
  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();

  if (!organizationId || !user) {
    throw new Error("Unauthorized");
  }

  const encryptedData = encryptClient(data);

  const updatedClient = await prismadb.clients.update({
    where: {
      id: clientId,
      organizationId,
    },
    data: {
      ...encryptedData,
      updatedBy: user.id,
    },
  });

  revalidatePath("/crm/clients");
  revalidatePath("/crm/accounts"); // Just in case
  return updatedClient;
};



















