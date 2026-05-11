"use client";

import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import { DataTableRowActions } from "@/components/ui/data-table/data-table-row-actions";
import RightViewModalNoTrigger from "@/components/modals/right-view-notrigger";
import { UpdateAccountForm, type AccountFormData } from "../components/UpdateAccountForm";

interface ClientRowActionsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>;
}

export function ClientRowActions({ row }: ClientRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const data = row.original;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    await axios.delete(`/api/crm/account/${data.id}`);
  };

  const handleWatch = async () => {
    try {
      await axios.post(`/api/crm/account/${data.id}/watch`);
      toast({ variant: "success", title: "Success", description: `Now watching ${data.name ?? data.client_name}` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not watch account" });
    }
  };

  const handleUnwatch = async () => {
    try {
      await axios.post(`/api/crm/account/${data.id}/unwatch`);
      toast({ variant: "success", title: "Success", description: `Stopped watching ${data.name ?? data.client_name}` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not unwatch account" });
    }
  };

  return (
    <>
      <RightViewModalNoTrigger
        title={`Update Account — ${data.name ?? data.client_name ?? ""}`}
        description="Update account details"
        open={editOpen}
        setOpen={setEditOpen}
      >
        <UpdateAccountForm initialData={row.original as AccountFormData} open={setEditOpen} />
      </RightViewModalNoTrigger>

      <DataTableRowActions
        row={row}
        entityType="contact"
        entityId={data.id}
        entityName={data.name || data.client_name}
        onView={() => router.push(`/app/crm/contacts/${data.friendlyId}`)}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDelete}
        onSchedule={true}
        onShare={true}
        customActions={[
          { id: "watch", label: "Watch Account", icon: Eye, onClick: handleWatch },
          { id: "unwatch", label: "Stop Watching", icon: EyeOff, onClick: handleUnwatch },
        ]}
        onActionComplete={() => { setEditOpen(false); router.refresh(); }}
      />
    </>
  );
}
