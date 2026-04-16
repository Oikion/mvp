// @ts-nocheck
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { deleteDeal } from "@/actions/deals";
import type { ActionResponse } from "@/lib/action-response";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import type { DealRow } from "../components/DealsList";

interface DealRowActionsProps {
  deal: DealRow;
  onRefresh?: () => void;
}

export function DealRowActions({ deal, onRefresh }: Readonly<DealRowActionsProps>) {
  const commonT = useTranslations("common");
  const t = useTranslations("deals");
  const router = useRouter();
  const { toast } = useAppToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleView = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}`);
  }, [router, deal.friendlyId]);

  const handleEdit = React.useCallback(() => {
    router.push(`/app/deals/${deal.friendlyId}?edit=true`);
  }, [router, deal.friendlyId]);

  const handleDelete = React.useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = (await deleteDeal(deal.id)) as ActionResponse<{ id: string }>;
      if (res.success) {
        toast.success("deleteSuccess");
        onRefresh?.();
        setConfirmOpen(false);
      } else {
        toast.error("deleteFailed", {
          description: res.error ?? undefined,
          isTranslationKey: false,
        });
      }
    } catch (error) {
      console.error("[DEAL_DELETE_UI]", error);
      toast.error("deleteFailed");
    } finally {
      setIsDeleting(false);
    }
  }, [deal.id, isDeleting, onRefresh, toast]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={commonT("actions")}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{commonT("actions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleView}>
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            {commonT("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("detail.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("detail.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("detail.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
