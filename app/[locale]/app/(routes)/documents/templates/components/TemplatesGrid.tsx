"use client";

import { TemplateCard } from "./TemplateCard";
import type { TemplateListItem } from "@/actions/templates/get-templates";

interface TemplatesGridProps {
  templates: TemplateListItem[];
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {templates.map((template) => (
        <TemplateCard key={template.type} {...template} />
      ))}
    </div>
  );
}
