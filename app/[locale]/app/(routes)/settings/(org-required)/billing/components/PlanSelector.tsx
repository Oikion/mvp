import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BillingActions } from "./BillingActions";
import type { OrgSubscription } from "@prisma/client";

type Props = {
  sub: OrgSubscription | null;
  defaultCycle?: "MONTHLY" | "YEARLY";
};

export async function PlanSelector({ sub, defaultCycle = "MONTHLY" }: Props) {
  const t = await getTranslations("billing");

  const plans = [
    {
      key: "PRO" as const,
      name: t("plan.pro"),
      monthlyPrice: "€39",
      yearlyPrice: "€390",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: Object.values(t.raw("proFeatures" as any) as Record<string, string>),
    },
    {
      key: "BUSINESS" as const,
      name: t("plan.business"),
      monthlyPrice: "€99",
      yearlyPrice: "€990",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features: Object.values(t.raw("businessFeatures" as any) as Record<string, string>),
    },
  ];

  const currentPlan = sub?.plan ?? "FREE";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        return (
          <Card key={plan.key} className={isCurrent ? "border-primary" : undefined}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="text-lg font-bold text-foreground">
                      {defaultCycle === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="text-xs ml-1">
                      {defaultCycle === "MONTHLY" ? t("perMonth") : t("perYear")}
                    </span>
                  </CardDescription>
                </div>
                {!isCurrent && (
                  <BillingActions
                    sub={sub}
                    plan={plan.key}
                    billingCycle={defaultCycle}
                    variant="upgrade"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
