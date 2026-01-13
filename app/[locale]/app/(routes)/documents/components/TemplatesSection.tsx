"use client";

import { TemplateType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, FileText, Sparkles } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import type { TemplateListItem } from "@/actions/templates/get-templates";

interface TemplatesSectionProps {
  templates: TemplateListItem[];
}

const templateColors: Record<TemplateType, string> = {
  BROKERAGE_MANDATE: "text-blue-500 bg-blue-500/10",
  LEASE_AGREEMENT: "text-green-500 bg-green-500/10",
  HANDOVER_PROTOCOL: "text-orange-500 bg-orange-500/10",
  VIEWING_CONFIRMATION: "text-purple-500 bg-purple-500/10",
};

export function TemplatesSection({ templates }: TemplatesSectionProps) {
  const t = useTranslations("templates");
  const locale = useLocale();
  const isGreek = locale === "el";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("page.title")}</h2>
        <Link href={`/${locale}/app/documents/templates`}>
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
            <Link
              key={template.type}
              href={`/${locale}/app/documents/create/${template.type}`}
            >
              <Card className="p-3 flex items-center gap-3 hover:shadow-md transition-all hover:border-primary/50 cursor-pointer group">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("fieldsCount", { count: template.placeholderCount })}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
