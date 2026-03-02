"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { z } from "zod";

const connectSchema = z.object({
  taskId: z.string().min(1),
  documentId: z.string().min(1),
});

const disconnectSchema = z.object({
  taskId: z.string().min(1),
  documentId: z.string().min(1),
});

export async function connectDocumentToTask(
  input: z.infer<typeof connectSchema>
): Promise<ActionResponse> {
  const guard = await requireAction("client:manage_contacts");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = connectSchema.safeParse(input);
  if (!validation.success) {
    return actionError("Invalid input", "VALIDATION_ERROR");
  }

  const { taskId, documentId } = validation.data;

  try {
    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });

    if (!task) return actionNotFound("Task");

    const document = await prismadb.documents.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true },
    });

    if (!document) return actionNotFound("Document");

    await prismadb.crm_Accounts_Tasks.update({
      where: { id: taskId },
      data: {
        Documents_DocumentsToCrmAccountsTasks: {
          connect: { id: documentId },
        },
      },
    });

    return actionSuccess();
  } catch (error) {
    console.error("[CONNECT_DOCUMENT_TO_TASK]", error);
    return actionError("Failed to connect document", error);
  }
}

export async function disconnectDocumentFromTask(
  input: z.infer<typeof disconnectSchema>
): Promise<ActionResponse> {
  const guard = await requireAction("client:manage_contacts");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = disconnectSchema.safeParse(input);
  if (!validation.success) {
    return actionError("Invalid input", "VALIDATION_ERROR");
  }

  const { taskId, documentId } = validation.data;

  try {
    const task = await prismadb.crm_Accounts_Tasks.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });

    if (!task) return actionNotFound("Task");

    await prismadb.crm_Accounts_Tasks.update({
      where: { id: taskId },
      data: {
        Documents_DocumentsToCrmAccountsTasks: {
          disconnect: { id: documentId },
        },
      },
    });

    return actionSuccess();
  } catch (error) {
    console.error("[DISCONNECT_DOCUMENT_FROM_TASK]", error);
    return actionError("Failed to disconnect document", error);
  }
}
