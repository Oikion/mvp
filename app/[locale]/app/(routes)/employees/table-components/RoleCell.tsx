"use client";

import { useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";

const ROLE_OPTIONS = [
  { value: "org:viewer", labelKey: "roleViewer" },
  { value: "org:member", labelKey: "roleMember" },
  { value: "org:lead", labelKey: "roleLead" },
  { value: "org:owner", labelKey: "roleOwner" },
] as const;

type RoleOption = (typeof ROLE_OPTIONS)[number]["labelKey"];

function getRoleLabel(t: (key: RoleOption) => string, role: string): string {
  switch (role) {
    case "org:owner": return t("roleOwner");
    case "org:lead": return t("roleLead");
    case "org:member": return t("roleMember");
    case "org:viewer": return t("roleViewer");
    default: return role;
  }
}

interface RoleCellProps {
  clerkUserId: string | null | undefined;
  orgRole: string;
}

export function RoleCell({ clerkUserId, orgRole }: RoleCellProps) {
  const [currentRole, setCurrentRole] = useState(orgRole);
  const [isLoading, setIsLoading] = useState(false);

  const { organization } = useOrganization();
  const t = useTranslations("admin");
  const { toast } = useAppToast();
  const router = useRouter();

  const isOwner = currentRole === "org:owner";

  if (isOwner) {
    return (
      <Badge variant="default" className="text-xs font-medium">
        {t("roleOwner")}
      </Badge>
    );
  }

  const handleRoleChange = async (newRole: string) => {
    if (!organization || !clerkUserId || newRole === currentRole) return;

    const previous = currentRole;
    setCurrentRole(newRole);
    setIsLoading(true);

    try {
      const members = await organization.getMemberships();
      const member = members.data?.find(
        (m) => m.publicUserData?.userId === clerkUserId
      );

      if (!member) {
        setCurrentRole(previous);
        return;
      }

      await member.update({ role: newRole });
      router.refresh();
      toast.success(t("rolesSaved"), { isTranslationKey: false });
    } catch (error: unknown) {
      console.error("[ROLE_CELL_UPDATE]", error);
      setCurrentRole(previous);
      const clerkError = error as { errors?: Array<{ message?: string }> };
      const msg = clerkError?.errors?.[0]?.message || t("rolesSaveError");
      toast.error(t("rolesSaveError"), { description: msg, isTranslationKey: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {isLoading && (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
      )}
      <Select value={currentRole} onValueChange={handleRoleChange} disabled={isLoading}>
        <SelectTrigger className="h-7 min-w-[110px] cursor-pointer border-0 bg-transparent px-2 text-xs shadow-none transition-colors hover:bg-muted focus:ring-0 data-[state=open]:bg-muted">
          <SelectValue>
            {getRoleLabel(t as (key: RoleOption) => string, currentRole)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.filter((opt) => opt.value !== "org:owner").map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {t(opt.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
