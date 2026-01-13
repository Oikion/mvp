"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  UserPlus,
  Link2,
  DollarSign,
  Check,
  Clock,
  XCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ApplicationForm } from "./ApplicationForm";

interface ReferralPortalClientProps {
  userName: string;
  userEmail: string;
  applicationStatus: "PENDING" | "APPROVED" | "DENIED" | null;
  hasReferralCode: boolean;
}

export function ReferralPortalClient({
  userName,
  userEmail,
  applicationStatus,
  hasReferralCode,
}: ReferralPortalClientProps) {
  const t = useTranslations("referrals.portal");
  const [showSuccess, setShowSuccess] = useState(false);

  // If user has referral code or is approved, redirect them to the referrals tab
  if (hasReferralCode || applicationStatus === "APPROVED") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-emerald-500/20 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                {t("applicationStatus.approved.title")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("applicationStatus.approved.description")}
              </p>
              <Link href="/app/profile?tab=referrals">
                <Button>
                  {t("applicationStatus.approved.cta")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If application is pending
  if (applicationStatus === "PENDING" || showSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-amber-500/20 mb-4">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                {showSuccess ? t("success.title") : t("applicationStatus.pending.title")}
              </h2>
              <p className="text-muted-foreground">
                {showSuccess ? t("success.description") : t("applicationStatus.pending.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If application was denied
  if (applicationStatus === "DENIED") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-500/30 bg-red-500/10 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-full bg-red-500/20 mb-4">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                {t("applicationStatus.denied.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("applicationStatus.denied.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Show how it works and application form
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
        {/* Commission highlight */}
        <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-6 py-3">
          <span className="text-lg font-bold text-primary">5%</span>
          <span className="text-lg text-muted-foreground">commission on referrals</span>
        </div>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>{t("howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="outline" className="mb-2">
                Step 1
              </Badge>
              <h3 className="font-semibold mb-1">{t("howItWorks.step1.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step1.description")}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="outline" className="mb-2">
                Step 2
              </Badge>
              <h3 className="font-semibold mb-1">{t("howItWorks.step2.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step2.description")}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="outline" className="mb-2">
                Step 3
              </Badge>
              <h3 className="font-semibold mb-1">{t("howItWorks.step3.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>{t("benefits.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{t("benefits.item1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{t("benefits.item2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{t("benefits.item3")}</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{t("benefits.item4")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Application Form */}
      <ApplicationForm
        userName={userName}
        userEmail={userEmail}
        onSuccess={() => setShowSuccess(true)}
      />
    </div>
  );
}
