"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DepartureLog } from "@prisma/client";
import type { EntityCounts } from "@/lib/data-ownership/types";

interface DepartureListClientProps {
  logs: DepartureLog[];
}

export function DepartureListClient({ logs }: DepartureListClientProps) {
  const t = useTranslations("dataOwnership.departures");

  if (logs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("empty")}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("agent")}</TableHead>
          <TableHead>{t("date")}</TableHead>
          <TableHead>{t("reason")}</TableHead>
          <TableHead>{t("policy")}</TableHead>
          <TableHead>{t("entities")}</TableHead>
          <TableHead>{t("deals")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const counts = log.entityCounts as unknown as EntityCounts;
          const reasonKey = `reason_${log.reason}` as const;
          return (
            <TableRow key={log.id}>
              <TableCell>
                <Link
                  href={`/app/settings/departures/${log.id}`}
                  className="font-medium hover:underline"
                >
                  {log.userName}
                </Link>
              </TableCell>
              <TableCell>
                {new Date(log.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{t(reasonKey as any)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={log.policyApplied === "AGENT" ? "default" : "secondary"}>
                  {log.policyApplied}
                </Badge>
              </TableCell>
              <TableCell>
                {counts.properties + counts.clients + counts.requests}
              </TableCell>
              <TableCell>{counts.deals}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
