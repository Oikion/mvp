"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "@/navigation";
import { archiveEntity } from "@/actions/archive/archive-entity";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import { useTranslations } from "next-intl";
import type { DealRow } from "../components/DealsList";

interface DealRowActionsProps {
  row: Row<DealRow>;
  onRefresh?: () => void;
}

export function DealRowActions({ row, onRefresh }: Readonly<DealRowActionsProps>) {
  const router = useRouter();
  const t = useTranslations("deals");
  const data = row.original;

  const handleDelete = async () => {
    const result = await archiveEntity("deal", data.id);
    if (!result.success) throw new Error(result.error);
  };

  return (
    <DataTableRowActions
      row={row}
      entityType="deal"
      entityId={data.id}
      entityName={data.title ?? t("title")}
      onView={() => router.push(`/app/deals/${data.friendlyId ?? data.id}`)}
      onDelete={handleDelete}
      onSchedule={true}
      onActionComplete={() => onRefresh?.()}
    />
  );
}
