"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ArchiveActions from "./ArchiveActions";
import type { ArchivableEntityType } from "@/actions/archive/archive-entity";
import type { ArchivedEntityRow } from "@/actions/archive/get-archived-entities";

interface ArchivedListProps {
  entityType: ArchivableEntityType;
  initialRows: ArchivedEntityRow[];
  canRestore: boolean;
  canPurge: boolean;
  refetch: () => Promise<ArchivedEntityRow[]>;
}

export default function ArchivedList({
  entityType,
  initialRows,
  canRestore,
  canPurge,
  refetch,
}: ArchivedListProps) {
  const t = useTranslations("archive");
  const [rows, setRows] = useState(initialRows);

  const handleSuccess = useCallback(async () => {
    const fresh = await refetch();
    setRows(fresh);
  }, [refetch]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        {t("empty")}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.name")}</TableHead>
          <TableHead>{t("table.archivedAt")}</TableHead>
          <TableHead>{t("table.archivedBy")}</TableHead>
          <TableHead>{t("table.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(row.archivedAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {row.archivedBy ?? "—"}
            </TableCell>
            <TableCell>
              <ArchiveActions
                entityType={entityType}
                id={row.id}
                canRestore={canRestore}
                canPurge={canPurge}
                onSuccess={handleSuccess}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
