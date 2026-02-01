"use client";

import { TemplateType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

interface TemplateCardProps {
  type: TemplateType;
  name: string;
  nameEn: string;
  nameEl: string;
  descriptionEn: string;
  descriptionEl: string;
  placeholderCount: number;
}

const templateIcons: Record<TemplateType, React.ReactNode> = {
  BROKERAGE_MANDATE: <FileText className="h-8 w-8 text-primary" />,
  LEASE_AGREEMENT: <FileText className="h-8 w-8 text-success" />,
  HANDOVER_PROTOCOL: <FileText className="h-8 w-8 text-warning" />,
  VIEWING_CONFIRMATION: <FileText className="h-8 w-8 text-purple-500" />,
};

export function TemplateCard({
  type,
  nameEn,
  nameEl,
  descriptionEn,
  descriptionEl,
  placeholderCount,
}: TemplateCardProps) {
  const t = useTranslations("templates");
  const locale = useLocale();
  const isGreek = locale === "el";

  const displayName = isGreek ? nameEl : nameEn;
  const displayDescription = isGreek ? descriptionEl : descriptionEn;

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200 group">
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
        <Button 
          size="sm" 
          className="w-full group-hover:bg-primary/90"
          leftIcon={<Sparkles className="h-4 w-4" />}
          rightIcon={<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          asChild
        >
          <Link href={`/${locale}/app/documents/create/${type}`}>
            {t("createDocument")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
