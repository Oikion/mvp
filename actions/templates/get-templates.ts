"use server";

import { TemplateType } from "@prisma/client";
import {
  getAllTemplateDefinitions,
  getTemplateDefinition,
  type TemplateDefinition,
} from "@/lib/templates";
import { requireAction } from "@/lib/permissions/action-guards";

export interface TemplateListItem {
  type: TemplateType;
  name: string;
  nameEn: string;
  nameEl: string;
  descriptionEn: string;
  descriptionEl: string;
  placeholderCount: number;
}

/**
 * Get all available document templates
 */
export async function getTemplates(): Promise<TemplateListItem[]> {
  // Permission check: Users need template:read permission
  const guard = await requireAction("template:read");
  if (guard) return [];

  const definitions = getAllTemplateDefinitions();

  return definitions.map((def) => ({
    type: def.type,
    name: def.name,
    nameEn: def.nameEn,
    nameEl: def.nameEl,
    descriptionEn: def.descriptionEn,
    descriptionEl: def.descriptionEl,
    placeholderCount: def.placeholders.length,
  }));
}

/**
 * Get a specific template definition by type
 */
export async function getTemplate(
  type: TemplateType
): Promise<TemplateDefinition | null> {
  // Permission check: Users need template:read permission
  const guard = await requireAction("template:read");
  if (guard) return null;

  const definition = getTemplateDefinition(type);
  return definition || null;
}
