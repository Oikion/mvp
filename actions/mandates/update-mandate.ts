"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { encryptMandateForOrg } from "@/lib/model-encryption";
import { updateMandateSchema } from "@/lib/validations/mandates";

export const updateMandate = async (data: any) => {
  const organizationId = await getCurrentOrgId();
  const user = await getCurrentUser();

  if (!organizationId || !user) {
    throw new Error("Unauthorized");
  }

  // Validate input against schema
  const parsed = updateMandateSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Validation failed: ${parsed.error.errors.map((e) => e.message).join(", ")}`
    );
  }

  const { id, ...fields } = parsed.data;

  const encryptedData = await encryptMandateForOrg(fields, organizationId);

  const updatedMandate = await prismadb.mandate.update({
    where: {
      id,
      organizationId,
    },
    data: {
      ...encryptedData,
      updatedAt: new Date(),
      updatedBy: user.id,
    } as any,
  });

  revalidatePath("/mandates");
  return updatedMandate;
};
