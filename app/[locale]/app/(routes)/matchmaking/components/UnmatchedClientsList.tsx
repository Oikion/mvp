"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Euro, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ClientSummary } from "@/lib/matchmaking";

interface Props {
  clients: ClientSummary[];
  locale: string;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function UnmatchedClientsList({ clients, locale }: Props) {
  const t = useTranslations("matchmaking");

  function formatBudget(min: number | null | undefined, max: number | null | undefined): string {
    if (!min && !max) return t("common.noBudget");
    if (!min) return t("common.budgetUpTo", { amount: formatPrice(max) });
    if (!max) return t("common.budgetFrom", { amount: formatPrice(min) });
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-success mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-medium text-success">{t("unmatchedClients.allClientsMatched")}</p>
        <p className="text-sm mt-2">{t("unmatchedClients.allClientsMatchedDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">
            {clients.length} {t("unmatchedClients.needsAttention")}
          </p>
          <p className="text-sm text-warning mt-1">
            {t("unmatchedClients.attentionDesc")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-warning/10 text-warning">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <Link 
                href={`/${locale}/app/crm/clients/${client.id}`}
                className="font-medium hover:text-primary"
              >
                {client.full_name || client.client_name}
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {client.intent || t("common.noIntent")}
                </Badge>
                <span className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  {formatBudget(client.budget_min, client.budget_max)}
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-warning">
                {client.bestMatchScore ? `${Math.round(client.bestMatchScore)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground">{t("unmatchedClients.bestMatch")}</div>
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/app/crm/clients/${client.id}`}>
                {t("unmatchedClients.review")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
