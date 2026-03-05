"use server";

import { z } from "zod";

import { requireAction } from "@/lib/permissions/action-guards";
import { getCurrentOrgId, getCurrentUser } from "@/lib/get-current-user";
import {
  actionError,
  actionSuccess,
  actionValidationError,
  type ActionResponse,
} from "@/lib/action-response";
import { upsertOrgSettings } from "@/lib/org-settings";
import { OPENAI_MODELS } from "@/lib/ai-sdk/providers";

const UpdateOpenAIModelSchema = z.object({
  model: z.string().min(1),
});

export async function updateOpenAIModel(model: string): Promise<ActionResponse<{ model: string }>> {
  const guard = await requireAction("admin:manage_org_settings");
  if (guard) return guard;

  const validation = UpdateOpenAIModelSchema.safeParse({ model });
  if (!validation.success) {
    return actionValidationError("Invalid model", validation.error.flatten().fieldErrors);
  }

  const organizationId = await getCurrentOrgId();
  const currentUser = await getCurrentUser();

  const isValidModel = OPENAI_MODELS.some((option) => option.id === model);
  if (!isValidModel) {
    return actionValidationError("Unsupported OpenAI model");
  }

  try {
    await upsertOrgSettings(organizationId, { openaiModel: model }, currentUser.id);
    return actionSuccess({ model });
  } catch (error) {
    console.error("[UPDATE_OPENAI_MODEL]", error);
    return actionError("Failed to update OpenAI model", error as Error);
  }
}
