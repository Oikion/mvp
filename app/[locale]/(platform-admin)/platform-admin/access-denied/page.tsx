// app/[locale]/(platform-admin)/platform-admin/access-denied/page.tsx
// Access denied page for unauthorized platform admin access attempts

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PlatformAdminAccessDeniedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("platformAdmin");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {t("accessDenied.title")}
          </CardTitle>
          <CardDescription>
            {t("accessDenied.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t("accessDenied.message")}
          </p>
          
          <div className="flex flex-col gap-2">
            <Button asChild variant="default">
              <Link href={`/${locale}`}>
                <Home className="mr-2 h-4 w-4" />
                {t("accessDenied.goHome")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/sign-in`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("accessDenied.signInDifferent")}
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {t("accessDenied.contactAdmin")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


