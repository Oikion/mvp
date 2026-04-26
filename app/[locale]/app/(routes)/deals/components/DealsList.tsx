"use client";

import * as React from "react";
import { useRouter } from "@/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { useDealColumns } from "../table-components/columns";

// ── Types ───────────────────────────────────────────────────────────────
export interface DealRow {
  id: string;
  friendlyId: string;
  title: string | null;
  stage: string;
  dealType: string | null;
  agreedPrice?: number | string | null;
  monthlyRentAmount?: number | string | null;
  createdAt: string | Date;
  property?: {
    id: string;
    title?: string | null;
    property_name?: string | null;
    address_city?: string | null;
    price?: number | string | null;
  } | null;
  listingAgent?: { id: string; name: string | null; avatar: string | null } | null;
  buyerAgent?: { id: string; name: string | null; avatar: string | null } | null;
  dealParties?: Array<{ id: string }>;
  commissionCurrency?: string | null;
}

interface DealsListProps {
  data: DealRow[];
  toolbarRight?: React.ReactNode;
  onRefresh?: () => void;
  users?: { id: string; name: string | null }[];
}

export function DealsList({ data, toolbarRight, onRefresh, users = [] }: Readonly<DealsListProps>) {
  const router = useRouter();
  const columns = useDealColumns(onRefresh, users);

  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="title"
      onRowOpen={(row) => router.push(`/app/deals/${row.original.friendlyId}`)}
      toolbarRight={toolbarRight}
    />
  );
}

export default DealsList;
