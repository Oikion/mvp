"use server";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { actionSuccess, actionError, actionNotFound, type ActionResponse } from "@/lib/action-response";
import { prismadb } from "@/lib/prisma";
import { z } from "zod";

const addNoteSchema = z.object({
  contactId: z.string().min(1),
  note: z.string().min(1).max(2000),
});

const deleteNoteSchema = z.object({
  contactId: z.string().min(1),
  noteIndex: z.number().int().min(0),
});

export async function addContactNote(
  input: z.infer<typeof addNoteSchema>
): Promise<ActionResponse<{ notes: string[] }>> {
  const guard = await requireAction("client:manage_contacts");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = addNoteSchema.safeParse(input);
  if (!validation.success) {
    return actionError("Invalid input", "VALIDATION_ERROR");
  }

  const { contactId, note } = validation.data;

  try {
    const contact = await prismadb.client_Contacts.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, notes: true },
    });

    if (!contact) return actionNotFound("Contact");

    const updated = await prismadb.client_Contacts.update({
      where: { id: contactId },
      data: { notes: [...contact.notes, note] },
      select: { notes: true },
    });

    return actionSuccess({ notes: updated.notes });
  } catch (error) {
    console.error("[ADD_CONTACT_NOTE]", error);
    return actionError("Failed to add note", error as Error);
  }
}

export async function deleteContactNote(
  input: z.infer<typeof deleteNoteSchema>
): Promise<ActionResponse<{ notes: string[] }>> {
  const guard = await requireAction("client:manage_contacts");
  if (guard) return guard;

  const organizationId = await getCurrentOrgId();

  const validation = deleteNoteSchema.safeParse(input);
  if (!validation.success) {
    return actionError("Invalid input", "VALIDATION_ERROR");
  }

  const { contactId, noteIndex } = validation.data;

  try {
    const contact = await prismadb.client_Contacts.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, notes: true },
    });

    if (!contact) return actionNotFound("Contact");

    const updatedNotes = contact.notes.filter((_, i) => i !== noteIndex);

    const updated = await prismadb.client_Contacts.update({
      where: { id: contactId },
      data: { notes: updatedNotes },
      select: { notes: true },
    });

    return actionSuccess({ notes: updated.notes });
  } catch (error) {
    console.error("[DELETE_CONTACT_NOTE]", error);
    return actionError("Failed to delete note", error as Error);
  }
}
