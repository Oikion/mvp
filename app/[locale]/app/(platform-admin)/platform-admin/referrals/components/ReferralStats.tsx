"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Wallet,
  Gift,
} from "lucide-react";
import type { AdminReferralStats } from "@/actions/referrals/admin-get-all-referrals";

interface ReferralStatsProps {
  stats: AdminReferralStats;
}

export function ReferralStats({ stats }: ReferralStatsProps) {
  const t = useTranslations("platformAdmin.referrals");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const statCards = [
    {
      title: t("stats.totalCodes"),
      value: stats.totalReferralCodes,
      icon: Gift,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: t("stats.totalReferrals"),
      value: stats.totalReferrals,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("stats.converted"),
      value: stats.convertedReferrals,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: t("stats.pending"),
      value: stats.pendingReferrals,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: t("stats.totalCommissions"),
      value: formatCurrency(stats.totalCommissionsEarned),
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      isAmount: true,
    },
    {
      title: t("stats.pendingPayouts"),
      value: formatCurrency(stats.totalCommissionsPending),
      icon: Wallet,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      isAmount: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {stat.title}
                </p>
                <p className={`text-xl font-bold ${stat.isAmount ? "text-lg" : ""}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
