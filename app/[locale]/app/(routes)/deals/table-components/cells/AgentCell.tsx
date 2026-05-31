"use client";

import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditableSelectCell } from "@/components/ui/data-table/editable-select-cell";

const initials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
};

interface AgentCellProps {
  dealId: string;
  /** "listingAgentId" or "buyerAgentId" */
  field: "listingAgentId" | "buyerAgentId";
  agent: { id: string; name: string | null; avatar: string | null } | null | undefined;
  users: { id: string; name: string | null }[];
  nullLabel?: string;
}

export function AgentCell({ dealId, field, agent, users, nullLabel }: AgentCellProps) {
  const router = useRouter();
  const t = useTranslations("deals");
  const resolvedNullLabel = nullLabel ?? t("cell.unassigned");

  const options = users
    .filter((u) => u.name)
    .map((u) => ({ value: u.id, label: u.name! }));

  const handleSave = async (value: string | null) => {
    await axios.put(`/api/deals/${dealId}`, { [field]: value });
    toast.success(t("cell.agentUpdated"));
    router.refresh();
  };

  const agentName = agent?.name ?? null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {agent && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={agent.avatar ?? undefined} alt="" />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {initials(agentName)}
          </AvatarFallback>
        </Avatar>
      )}
      <EditableSelectCell
        value={agent?.id ?? null}
        onSave={handleSave}
        options={options}
        nullLabel={resolvedNullLabel}
        width="160px"
      />
    </div>
  );
}
