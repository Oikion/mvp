import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClerkClient } from "@/lib/clerk";
import Container from "@/app/[locale]/app/(routes)/components/ui/Container";
import { getOrgSubscription } from "@/lib/billing/plan-access";
import { getOrgMemberCount } from "@/lib/billing/helpers";
import { CurrentPlanCard } from "./components/CurrentPlanCard";
import { PlanSelector } from "./components/PlanSelector";
import { BillingActions } from "./components/BillingActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
};

export default async function BillingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { success, canceled } = await searchParams;
  const t = await getTranslations("billing");

  const { userId, orgId: organizationId } = await auth();
  if (!userId || !organizationId) redirect(`/${locale}/app/sign-in`);

  const clerk = await getClerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId });
  const isPersonalWorkspace =
    (org.publicMetadata as Record<string, unknown>)?.type === "personal";
  if (isPersonalWorkspace) redirect(`/${locale}/app`);

  const [sub, memberCount] = await Promise.all([
    getOrgSubscription(organizationId),
    getOrgMemberCount(organizationId),
  ]);

  const currentPlan = sub?.plan ?? "FREE";
  const hasSubscription = sub?.stripeSubscriptionId != null;
  const defaultCycle = sub?.billingCycle ?? "MONTHLY";

  return (
    <Container title={t("title")} description={t("upgradeDescription")}>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {t("success", {
                plan: currentPlan === "PRO" ? t("plan.pro") : t("plan.business"),
              })}
            </AlertDescription>
          </Alert>
        )}

        {canceled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{t("canceled")}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <CurrentPlanCard sub={sub} memberCount={memberCount} />

          {hasSubscription && (
            <div className="flex items-start">
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">{t("actions.manage")}</p>
                <BillingActions sub={sub} variant="portal" />
              </div>
            </div>
          )}
        </div>

        {currentPlan !== "BUSINESS" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("upgradeTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("upgradeDescription")}</p>
            </div>
            <PlanSelector sub={sub} defaultCycle={defaultCycle} />
          </div>
        )}
      </div>
    </Container>
  );
}
