"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Users,
  CalendarPlus,
  Upload,
  Zap,
  FileText,
} from "lucide-react";

interface QuickAction {
  key: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "outline";
}

export const QuickActions: React.FC = () => {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const quickActions: QuickAction[] = [
    {
      key: "newProperty",
      icon: <Home className="h-4 w-4" />,
      href: `/${locale}/app/mls?action=create`,
    },
    {
      key: "newClient",
      icon: <Users className="h-4 w-4" />,
      href: `/${locale}/app/crm?action=create`,
    },
    {
      key: "newEvent",
      icon: <CalendarPlus className="h-4 w-4" />,
      href: `/${locale}/app/calendar?action=create`,
    },
    {
      key: "uploadDocument",
      icon: <Upload className="h-4 w-4" />,
      href: `/${locale}/app/documents?action=upload`,
    },
    {
      key: "viewDocuments",
      icon: <FileText className="h-4 w-4" />,
      href: `/${locale}/app/documents`,
      variant: "outline",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("quickActions")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant || "outline"}
                    size="icon"
                    asChild
                    className="h-10 w-10 shrink-0"
                  >
                    <Link href={action.href}>
                      {action.icon}
                      <span className="sr-only">{t(`quickAction.${action.key}`)}</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t(`quickAction.${action.key}`)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
