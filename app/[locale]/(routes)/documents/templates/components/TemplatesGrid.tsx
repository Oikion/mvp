"use client";

import { useState } from "react";
import { TemplateType } from "@prisma/client";
import { TemplateCard } from "./TemplateCard";
import { GenerateDocumentModal } from "./GenerateDocumentModal";
import type { TemplateListItem } from "@/actions/templates/get-templates";

interface TemplatesGridProps {
  templates: TemplateListItem[];
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleGenerate = (type: TemplateType) => {
    setSelectedTemplate(type);
    setModalOpen(true);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.type}
            {...template}
            onGenerate={handleGenerate}
          />
        ))}
      </div>

      <GenerateDocumentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        templateType={selectedTemplate}
      />
    </>
  );
}

