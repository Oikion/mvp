"use client";

import { useRouter } from "@/navigation";
import axios from "axios";
import { toast } from "sonner";
import { EditableTextCell } from "@/components/ui/data-table/editable-text-cell";
import { cn } from "@/lib/utils";
import { Building2, User } from "lucide-react";

interface NameCellProps {
  contactId: string;
  displayName: string;
  isCompany?: boolean;
}

export function NameCell({ contactId, displayName, isCompany }: NameCellProps) {
  const router = useRouter();

  const handleSave = async (newValue: string) => {
    await axios.put(`/api/crm/contacts/${contactId}`, { displayName: newValue });
    toast.success("Name updated");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isCompany ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"
        )}
        aria-hidden="true"
      >
        {isCompany ? (
          <Building2 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
        ) : (
          <User className="h-3.5 w-3.5 text-primary" />
        )}
      </div>
      <EditableTextCell
        value={displayName}
        onSave={handleSave}
        required
        placeholder="Contact name"
        className="font-medium truncate max-w-[200px]"
      />
    </div>
  );
}
