"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import { useTranslations } from "next-intl";
import type { RequestRow } from "./columns";

interface RequestRowActionsProps {
  row: Row<RequestRow>;
}

export function RequestRowActions({ row }: RequestRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("requests");
  const data = row.original;

  const handleDelete = async () => {
    await axios.delete(`/api/requests/${data.id}`);
  };

  return (
    <DataTableRowActions
      row={row}
      entityType="request"
      entityId={data.id}
      entityName={data.title ?? t("pageTitle")}
      onView={() => router.push(`/app/requests/${data.friendlyId ?? data.id}`)}
      onDelete={handleDelete}
      onSchedule={true}
      onShare={true}
      onActionComplete={() => router.refresh()}
    />
  );
}
