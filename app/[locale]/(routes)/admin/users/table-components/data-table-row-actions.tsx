"use client";

import { Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { adminUserSchema } from "../table-data/schema";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@clerk/nextjs";

import { Copy, MoreHorizontal, Shield, ShieldOff, UserMinus } from "lucide-react";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const t = useTranslations("admin");
  const router = useRouter();
  const data = adminUserSchema.parse(row.original);
  const { organization } = useOrganization();

  const [removeOpen, setRemoveOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      variant: "info",
      title: t("copied"),
      description: t("userIdCopied"),
    });
  };

  // Remove member from organization
  const onRemoveMember = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      
      const members = await organization.getMemberships();
      const memberToRemove = members.data?.find(
        (m) => m.publicUserData?.userId === (row.original as any).clerkUserId
      );

      if (memberToRemove) {
        await memberToRemove.destroy();
        router.refresh();
        toast({
          variant: "success",
          title: t("success"),
          description: t("memberRemoved"),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: t("memberNotFound"),
        });
      }
    } catch (error: any) {
      console.error("Remove member error:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error?.errors?.[0]?.message || t("somethingWentWrong"),
      });
    } finally {
      setLoading(false);
      setRemoveOpen(false);
    }
  };

  // Update member role to admin
  const onPromoteToAdmin = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      
      const members = await organization.getMemberships();
      const memberToUpdate = members.data?.find(
        (m) => m.publicUserData?.userId === (row.original as any).clerkUserId
      );

      if (memberToUpdate) {
        await memberToUpdate.update({ role: "org:admin" });
        router.refresh();
        toast({
          variant: "success",
          title: t("success"),
          description: t("memberPromoted"),
        });
      }
    } catch (error: any) {
      console.error("Promote to admin error:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error?.errors?.[0]?.message || t("somethingWentWrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  // Update member role to member (demote from admin)
  const onDemoteFromAdmin = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      
      const members = await organization.getMemberships();
      const memberToUpdate = members.data?.find(
        (m) => m.publicUserData?.userId === (row.original as any).clerkUserId
      );

      if (memberToUpdate) {
        await memberToUpdate.update({ role: "org:member" });
        router.refresh();
        toast({
          variant: "success",
          title: t("success"),
          description: t("memberDemoted"),
        });
      }
    } catch (error: any) {
      console.error("Demote from admin error:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error?.errors?.[0]?.message || t("somethingWentWrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUserAdmin = data.orgRole === "org:admin";

  return (
    <>
      <AlertModal
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={onRemoveMember}
        loading={loading}
        title={t("removeMemberTitle")}
        description={t("removeMemberDescription")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="h-8 w-8 p-0">
            <span className="sr-only">{t("openMenu")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data?.id)}>
            <Copy className="mr-2 w-4 h-4" />
            {t("copyId")}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {!isCurrentUserAdmin ? (
            <DropdownMenuItem onClick={onPromoteToAdmin} disabled={loading}>
              <Shield className="mr-2 w-4 h-4" />
              {t("promoteToAdmin")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onDemoteFromAdmin} disabled={loading}>
              <ShieldOff className="mr-2 w-4 h-4" />
              {t("removeAdminRole")}
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setRemoveOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="mr-2 w-4 h-4" />
            {t("removeFromOrg")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
