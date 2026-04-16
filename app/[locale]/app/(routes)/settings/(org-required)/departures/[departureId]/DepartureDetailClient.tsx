"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartureLog } from "@prisma/client";
import type {
  MigratedEntities,
  CancelledDeals,
  EntityCounts,
} from "@/lib/data-ownership/types";

interface DepartureDetailClientProps {
  log: DepartureLog;
}

export function DepartureDetailClient({ log }: DepartureDetailClientProps) {
  const t = useTranslations("dataOwnership.departures");
  const td = useTranslations("dataOwnership.departures.detail");

  const entities = log.migratedEntities as unknown as MigratedEntities;
  const deals = log.cancelledDeals as unknown as CancelledDeals;
  const counts = log.entityCounts as unknown as EntityCounts;
  const reasonKey = `reason_${log.reason}` as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("agent")}</p>
          <p className="font-medium">{log.userName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("date")}</p>
          <p className="font-medium">
            {new Date(log.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("reason")}</p>
          <Badge variant="outline">{t(reasonKey as any)}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("policy")}</p>
          <Badge variant={log.policyApplied === "AGENT" ? "default" : "secondary"}>
            {log.policyApplied}
          </Badge>
        </div>
      </div>

      {log.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{td("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{log.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {counts.properties > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {td("properties")} ({counts.properties})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {entities.properties.map((p) => (
                  <li key={p.id} className="text-sm">{p.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {counts.clients > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {td("clients")} ({counts.clients})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {entities.clients.map((c) => (
                  <li key={c.id} className="text-sm">{c.name}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {counts.requests > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {td("requests")} ({counts.requests})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {entities.requests.map((m) => (
                  <li key={m.id} className="text-sm">{m.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {counts.deals > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {td("cancelledDeals")} ({counts.deals})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {deals.map((d) => (
                  <li key={d.id} className="text-sm">{d.title}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
