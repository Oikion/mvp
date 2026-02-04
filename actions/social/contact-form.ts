"use server";

import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_CONTACT_FORM_FIELDS,
  type ContactFormField,
  type ContactFormSettings,
} from "@/lib/contact-form-types";

/**
 * Get contact form settings for the current user's agent profile
 */
export async function getContactFormSettings(): Promise<ContactFormSettings> {
  const currentUser = await getCurrentUser();

  const profile = await prismadb.agentProfile.findUnique({
    where: { userId: currentUser.id },
    select: {
      contactFormEnabled: true,
      contactFormFields: true,
    },
  });

  if (!profile) {
    return {
      enabled: false,
      fields: DEFAULT_CONTACT_FORM_FIELDS,
    };
  }

  return {
    enabled: profile.contactFormEnabled,
    fields:
      (profile.contactFormFields as unknown as ContactFormField[]) ||
      DEFAULT_CONTACT_FORM_FIELDS,
  };
}

/**
 * Update contact form settings
 */
export async function updateContactFormSettings(
  settings: ContactFormSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
    });

    if (!profile) {
      return { success: false, error: "Profile not found. Please create your profile first." };
    }

    // Validate fields
    if (settings.enabled && settings.fields.length === 0) {
      return { success: false, error: "At least one form field is required when the form is enabled." };
    }

    // Ensure required fields have proper validation
    const hasEmailField = settings.fields.some((f) => f.type === "email");
    if (settings.enabled && !hasEmailField) {
      return { success: false, error: "An email field is required for contact form submissions." };
    }

    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: {
        contactFormEnabled: settings.enabled,
        contactFormFields: settings.fields as any,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile/public");
    if (currentUser.username) {
      revalidatePath(`/agent/${currentUser.username}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating contact form settings:", error);
    return { success: false, error: "Failed to update contact form settings" };
  }
}

/**
 * Toggle contact form enabled status
 */
export async function toggleContactForm(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: {
        contactFormFields: true,
      },
    });

    if (!profile) {
      return { success: false, error: "Profile not found. Please create your profile first." };
    }

    // If enabling and no fields configured, set defaults
    const fields = (profile.contactFormFields as unknown as ContactFormField[]) || DEFAULT_CONTACT_FORM_FIELDS;
    
    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: {
        contactFormEnabled: enabled,
        contactFormFields: fields as any,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile/public");
    if (currentUser.username) {
      revalidatePath(`/agent/${currentUser.username}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error toggling contact form:", error);
    return { success: false, error: "Failed to toggle contact form" };
  }
}

/**
 * Get contact form settings for a public profile by username
 */
export async function getPublicContactFormSettings(username: string): Promise<ContactFormSettings | null> {
  const user = await prismadb.users.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const profile = await prismadb.agentProfile.findFirst({
    where: {
      userId: user.id,
      visibility: { in: ["PUBLIC", "SECURE"] },
    },
    select: {
      contactFormEnabled: true,
      contactFormFields: true,
    },
  });

  if (!profile || !profile.contactFormEnabled) {
    return null;
  }

  return {
    enabled: profile.contactFormEnabled,
    fields: (profile.contactFormFields as unknown as ContactFormField[]) || DEFAULT_CONTACT_FORM_FIELDS,
  };
}

/**
 * Add a custom field to the contact form
 */
export async function addContactFormField(
  field: Omit<ContactFormField, "id" | "order">
): Promise<{ success: boolean; field?: ContactFormField; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: {
        contactFormFields: true,
      },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const currentFields = (profile.contactFormFields as unknown as ContactFormField[]) || DEFAULT_CONTACT_FORM_FIELDS;
    
    const newField: ContactFormField = {
      ...field,
      id: `custom_${Date.now()}`,
      order: currentFields.length,
    };

    const updatedFields = [...currentFields, newField];

    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: {
        contactFormFields: updatedFields as any,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile/public");
    if (currentUser.username) {
      revalidatePath(`/agent/${currentUser.username}`);
    }

    return { success: true, field: newField };
  } catch (error) {
    console.error("Error adding contact form field:", error);
    return { success: false, error: "Failed to add field" };
  }
}

/**
 * Remove a field from the contact form
 */
export async function removeContactFormField(
  fieldId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: {
        contactFormFields: true,
      },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const currentFields = (profile.contactFormFields as unknown as ContactFormField[]) || [];
    const updatedFields = currentFields
      .filter((f) => f.id !== fieldId)
      .map((f, index) => ({ ...f, order: index }));

    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: {
        contactFormFields: updatedFields as any,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile/public");
    if (currentUser.username) {
      revalidatePath(`/agent/${currentUser.username}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing contact form field:", error);
    return { success: false, error: "Failed to remove field" };
  }
}

/**
 * Update field order
 */
export async function reorderContactFormFields(
  orderedFieldIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      select: {
        contactFormFields: true,
      },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const currentFields = (profile.contactFormFields as unknown as ContactFormField[]) || [];
    const fieldMap = new Map(currentFields.map((f) => [f.id, f]));
    
    const reorderedFields = orderedFieldIds
      .map((id, index) => {
        const field = fieldMap.get(id);
        if (!field) return null;
        return { ...field, order: index };
      })
      .filter((f): f is ContactFormField => f !== null);

    await prismadb.agentProfile.update({
      where: { userId: currentUser.id },
      data: {
        contactFormFields: reorderedFields as any,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/profile/public");
    if (currentUser.username) {
      revalidatePath(`/agent/${currentUser.username}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error reordering fields:", error);
    return { success: false, error: "Failed to reorder fields" };
  }
}
