"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export function AlreadySignedInBanner() {
  const t = useTranslations("auth");

  return (
    <Card className="min-w-[60dvw] border-border bg-card">
      <CardContent className="py-4 px-6">
        <div className="flex items-center gap-6">
          <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
            <CheckCircle className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
            {t("alreadySignedIn.title")}
          </h2>
          <div className="flex-1" />
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link href="/">
              {t("alreadySignedIn.goToDashboard")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

