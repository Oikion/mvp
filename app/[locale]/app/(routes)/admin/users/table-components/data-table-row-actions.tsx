"use client";

import { Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { adminUserSchema } from "../table-data/schema";
import { Copy, MoreHorizontal, Shield, ShieldOff, UserMinus, Loader2 } from "lucide-react";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const t = useTranslations("admin");
  const commonT = useTranslations("common");
  const router = useRouter();
  const data = adminUserSchema.parse(row.original);
  const { organization } = useOrganization();

  const [removeOpen, setRemoveOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useAppToast();

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.info(t, { description: t, isTranslationKey: false });
  };

  // Remove member from organization
  const onRemoveMember = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      
      const members = await organization.getMemberships();
      const memberToRemove = members.data?.find(
        (m) => m.publicUserData?.userId === (row.original as { clerkUserId?: string }).clerkUserId
      );

      if (memberToRemove) {
        await memberToRemove.destroy();
        router.refresh();
        toast.success(t, { description: t, isTranslationKey: false });
      } else {
        toast.error(t, { description: t, isTranslationKey: false });
      }
    } catch (error: unknown) {
      console.error("Remove member error:", error);
      const clerkError = error as { errors?: Array<{ message?: string }> };
      toast.error(t, { description: clerkError?.errors, isTranslationKey: false });
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
        (m) => m.publicUserData?.userId === (row.original as { clerkUserId?: string }).clerkUserId
      );

      if (memberToUpdate) {
        await memberToUpdate.update({ role: "org:admin" });
        router.refresh();
        toast.success(t, { description: t, isTranslationKey: false });
      }
    } catch (error: unknown) {
      console.error("Promote to admin error:", error);
      const clerkError = error as { errors?: Array<{ message?: string }> };
      toast.error(t, { description: clerkError?.errors, isTranslationKey: false });
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
        (m) => m.publicUserData?.userId === (row.original as { clerkUserId?: string }).clerkUserId
      );

      if (memberToUpdate) {
        await memberToUpdate.update({ role: "org:member" });
        router.refresh();
        toast.success(t, { description: t, isTranslationKey: false });
      }
    } catch (error: unknown) {
      console.error("Demote from admin error:", error);
      const clerkError = error as { errors?: Array<{ message?: string }> };
      toast.error(t, { description: clerkError?.errors, isTranslationKey: false });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUserAdmin = data.orgRole === "org:admin";

  return (
    <>
      {/* Remove Member Confirmation Dialog - using standard AlertDialog */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeMemberTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeMemberDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {commonT("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onRemoveMember();
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {commonT("loading")}
                </>
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  {t("removeFromOrg")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">{t("openMenu")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{commonT("actions")}</DropdownMenuLabel>
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
