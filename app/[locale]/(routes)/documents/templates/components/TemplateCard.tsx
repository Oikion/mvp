"use client";

import { TemplateType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

interface TemplateCardProps {
  type: TemplateType;
  name: string;
  nameEn: string;
  nameEl: string;
  descriptionEn: string;
  descriptionEl: string;
  docxFilename: string;
  placeholderCount: number;
  onGenerate: (type: TemplateType) => void;
}

const templateIcons: Record<TemplateType, React.ReactNode> = {
  BROKERAGE_MANDATE: <FileText className="h-8 w-8 text-blue-500" />,
  LEASE_AGREEMENT: <FileText className="h-8 w-8 text-green-500" />,
  HANDOVER_PROTOCOL: <FileText className="h-8 w-8 text-orange-500" />,
  VIEWING_CONFIRMATION: <FileText className="h-8 w-8 text-purple-500" />,
};

export function TemplateCard({
  type,
  nameEn,
  nameEl,
  descriptionEn,
  descriptionEl,
  docxFilename,
  placeholderCount,
  onGenerate,
}: TemplateCardProps) {
  const t = useTranslations("templates");
  const locale = useLocale();
  const isGreek = locale === "el";

  const displayName = isGreek ? nameEl : nameEn;
  const displayDescription = isGreek ? descriptionEl : descriptionEn;

  const handleDownloadDocx = () => {
    // Download from public folder
    const link = document.createElement("a");
    link.href = `/templates/${docxFilename}`;
    link.download = docxFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <div className="p-2 rounded-lg bg-muted">{templateIcons[type]}</div>
        <div className="flex-1">
          <CardTitle className="text-lg leading-tight">{displayName}</CardTitle>
          <CardDescription className="mt-1.5 text-sm line-clamp-2">
            {displayDescription}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end pt-0">
        <div className="text-xs text-muted-foreground mb-4">
          {t("fieldsCount", { count: placeholderCount })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownloadDocx}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {t("downloadDocx")}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onGenerate(type)}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {t("generatePdf")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

