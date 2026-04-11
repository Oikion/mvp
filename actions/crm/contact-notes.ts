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

/**
 * Add a note to a contact's communicationNotes JSON array.
 * In v2.0, notes are stored as an array in `communicationNotes` since
 * the Contact model's `notes` field is a single encrypted string.
 */
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
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, communicationNotes: true },
    });

    if (!contact) return actionNotFound("Contact");

    const existingNotes: string[] = Array.isArray(contact.communicationNotes)
      ? (contact.communicationNotes as string[])
      : [];

    const updated = await prismadb.contact.update({
      where: { id: contactId },
      data: { communicationNotes: [...existingNotes, note] },
      select: { communicationNotes: true },
    });

    const notes = Array.isArray(updated.communicationNotes)
      ? (updated.communicationNotes as string[])
      : [];

    return actionSuccess({ notes });
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
    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, communicationNotes: true },
    });

    if (!contact) return actionNotFound("Contact");

    const existingNotes: string[] = Array.isArray(contact.communicationNotes)
      ? (contact.communicationNotes as string[])
      : [];

    const updatedNotes = existingNotes.filter((_, i) => i !== noteIndex);

    const updated = await prismadb.contact.update({
      where: { id: contactId },
      data: { communicationNotes: updatedNotes },
      select: { communicationNotes: true },
    });

    const notes = Array.isArray(updated.communicationNotes)
      ? (updated.communicationNotes as string[])
      : [];

    return actionSuccess({ notes });
  } catch (error) {
    console.error("[DELETE_CONTACT_NOTE]", error);
    return actionError("Failed to delete note", error as Error);
  }
}
