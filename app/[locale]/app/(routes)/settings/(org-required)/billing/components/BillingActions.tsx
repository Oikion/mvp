"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { OrgSubscription } from "@prisma/client";

type Props = {
  sub: OrgSubscription | null;
  plan?: "PRO" | "BUSINESS";
  billingCycle?: "MONTHLY" | "YEARLY";
  variant?: "upgrade" | "portal";
};

export function BillingActions({ sub, plan, billingCycle, variant = "portal" }: Props) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!plan || !billingCycle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };

  if (variant === "upgrade") {
    return (
      <Button onClick={handleUpgrade} disabled={loading} size="sm">
        {loading ? t("actions.upgrading") : t("actions.upgrade")}
      </Button>
    );
  }

  if (!sub?.stripeSubscriptionId) return null;

  return (
    <Button onClick={handlePortal} disabled={loading} variant="outline" size="sm">
      {loading ? t("actions.managing") : t("actions.portal")}
    </Button>
  );
}
