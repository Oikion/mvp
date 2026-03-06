"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import axios from "axios";
import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import EditMandateForm from "../[slug]/components/EditMandateForm";

interface Mandate {
  id: string;
  title: string;
  status: string;
  urgency?: string | null;
  transaction_type: string;
  property_type?: string | null;
  property_purpose?: string | null;
  areas_of_interest?: string[] | null;
  municipality?: string | null;
  region?: string | null;
  size_min_sqm?: number | null;
  size_max_sqm?: number | null;
  plot_size_min_sqm?: number | null;
  plot_size_max_sqm?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  bedrooms_min?: number | null;
  bedrooms_max?: number | null;
  bathrooms_min?: number | null;
  bathrooms_max?: number | null;
  floor_min?: number | null;
  floor_max?: number | null;
  ground_floor_only?: boolean | null;
  condition?: string[] | null;
  year_built_min?: number | null;
  year_built_max?: number | null;
  heating_type?: string[] | null;
  energy_cert_min?: string | null;
  furnished?: string | null;
  elevator?: boolean | null;
  parking?: boolean | null;
  pets_allowed?: boolean | null;
  amenities?: string[] | null;
  inside_city_plan?: boolean | null;
  legalization_ok?: boolean | null;
  timeline?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  assigned_to?: string | null;
}

interface MandateRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

/**
 * Mandate-specific row actions using the unified DataTableRowActions component.
 * Provides: View, Edit (right-slide modal), Delete
 */
export function MandateRowActions({ row }: MandateRowActionsProps) {
  const router = useRouter();
  const data = row.original as Mandate;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`/api/mandates/${data.id}`);
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={data.title}
        description="Edit mandate details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <EditMandateForm
          mandate={data}
          onSave={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="mandate"
        entityId={data.id}
        entityName={data.title}
        onView={() => router.push(`/app/mandates/${data.id}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onActionComplete={() => router.refresh()}
      />
    </>
  );
}
