"use client";

import { useState } from "react";
import { TemplateType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, FileText, Download, Sparkles } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { GenerateDocumentModal } from "../templates/components/GenerateDocumentModal";
import Link from "next/link";
import type { TemplateListItem } from "@/actions/templates/get-templates";

interface TemplatesSectionProps {
  templates: TemplateListItem[];
}

const templateColors: Record<TemplateType, string> = {
  BROKERAGE_MANDATE: "text-blue-500 bg-blue-50 dark:bg-blue-950/50",
  LEASE_AGREEMENT: "text-green-500 bg-green-50 dark:bg-green-950/50",
  HANDOVER_PROTOCOL: "text-orange-500 bg-orange-50 dark:bg-orange-950/50",
  VIEWING_CONFIRMATION: "text-purple-500 bg-purple-50 dark:bg-purple-950/50",
};

export function TemplatesSection({ templates }: TemplatesSectionProps) {
  const t = useTranslations("templates");
  const locale = useLocale();
  const isGreek = locale === "el";
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleGenerate = (type: TemplateType) => {
    setSelectedTemplate(type);
    setModalOpen(true);
  };

  const handleDownloadDocx = (docxFilename: string) => {
    const link = document.createElement("a");
    link.href = `/templates/${docxFilename}`;
    link.download = docxFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("page.title")}</h2>
          <Link href={`/${locale}/documents/templates`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {isGreek ? "Προβολή όλων" : "View all"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map((template) => {
            const displayName = isGreek ? template.nameEl : template.nameEn;
            const colorClass = templateColors[template.type];
            
            return (
              <Card
                key={template.type}
                className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("fieldsCount", { count: template.placeholderCount })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownloadDocx(template.docxFilename)}
                    title={t("downloadDocx")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleGenerate(template.type)}
                    title={t("generatePdf")}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <GenerateDocumentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        templateType={selectedTemplate}
      />
    </>
  );
}

