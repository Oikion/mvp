"use server";

import { TemplateType } from "@prisma/client";
import {
  getAllTemplateDefinitions,
  getTemplateDefinition,
  type TemplateDefinition,
} from "@/lib/templates";

export interface TemplateListItem {
  type: TemplateType;
  name: string;
  nameEn: string;
  nameEl: string;
  descriptionEn: string;
  descriptionEl: string;
  docxFilename: string;
  placeholderCount: number;
}

/**
 * Get all available document templates
 */
export async function getTemplates(): Promise<TemplateListItem[]> {
  const definitions = getAllTemplateDefinitions();

  return definitions.map((def) => ({
    type: def.type,
    name: def.name,
    nameEn: def.nameEn,
    nameEl: def.nameEl,
    descriptionEn: def.descriptionEn,
    descriptionEl: def.descriptionEl,
    docxFilename: def.docxFilename,
    placeholderCount: def.placeholders.length,
  }));
}

/**
 * Get a specific template definition by type
 */
export async function getTemplate(
  type: TemplateType
): Promise<TemplateDefinition | null> {
  const definition = getTemplateDefinition(type);
  return definition || null;
}

