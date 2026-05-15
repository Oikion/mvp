import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { OrgSubscription } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { format } from "date-fns";

type Props = {
  sub: OrgSubscription | null;
  memberCount: number;
};

export async function CurrentPlanCard({ sub, memberCount }: Props) {
  const t = await getTranslations("billing");

  const plan = sub?.plan ?? "FREE";
  const status = sub?.status ?? "INACTIVE";
  const seatAllowance = sub?.seatAllowance ?? 0;
  const totalSeats = seatAllowance + (sub?.overageSeats ?? 0);

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    TRIALING: "secondary",
    PAST_DUE: "destructive",
    CANCELED: "outline",
    INACTIVE: "outline",
    UNPAID: "destructive",
  };

  const STATUS_LABEL = {
    ACTIVE: t("status.active"),
    TRIALING: t("status.trialing"),
    PAST_DUE: t("status.past_due"),
    CANCELED: t("status.canceled"),
    INACTIVE: t("status.inactive"),
    UNPAID: t("status.unpaid"),
  } as const;

  const PLAN_LABEL = {
    FREE: t("plan.free"),
    PRO: t("plan.pro"),
    BUSINESS: t("plan.business"),
  } as const;

  const CYCLE_LABEL = {
    MONTHLY: t("cycle.monthly"),
    YEARLY: t("cycle.yearly"),
  } as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("currentPlan")}</CardTitle>
          <Badge variant={statusVariant[status] ?? "outline"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{PLAN_LABEL[plan] ?? plan}</span>
          {sub?.billingCycle && (
            <span className="text-sm text-muted-foreground">
              · {CYCLE_LABEL[sub.billingCycle]}
            </span>
          )}
        </div>

        {plan !== "FREE" && seatAllowance > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("seats.label")}</span>
              <span className="tabular-nums">
                {t("seats.used", { used: memberCount, total: totalSeats })}
              </span>
            </div>
            <Progress value={(memberCount / Math.max(totalSeats, 1)) * 100} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {t("seats.included", { count: seatAllowance })}
              {(sub?.overageSeats ?? 0) > 0 && (
                <> · {t("seats.overage", { count: sub!.overageSeats })}</>
              )}
            </p>
          </div>
        )}

        {sub?.currentPeriodEnd && status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
          <p className="text-xs text-muted-foreground">
            {t("renewal", { date: format(sub.currentPeriodEnd, "PPP") })}
          </p>
        )}
        {sub?.currentPeriodEnd && sub.cancelAtPeriodEnd && (
          <p className="text-xs text-destructive">
            {t("cancelAt", { date: format(sub.currentPeriodEnd, "PPP") })}
          </p>
        )}

        {status === "PAST_DUE" && (
          <p className="text-xs text-destructive">{t("pastDueNotice")}</p>
        )}
      </CardContent>
    </Card>
  );
}
