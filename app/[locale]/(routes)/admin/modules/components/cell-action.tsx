"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, PowerIcon, PowerOffIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ModuleColumn } from "./Columns";

interface CellActionProps {
  data: ModuleColumn;
}

export const CellAction = ({ data }: CellActionProps) => {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const onActivate = async () => {
    try {
      await axios.post(`/api/admin/activateModule/${data.id}`);
      router.refresh();
      toast({
        variant: "success",
        title: t("success"),
        description: t("moduleActivated"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("moduleActivateError"),
      });
    }
  };

  const onDeactivate = async () => {
    try {
      await axios.post(`/api/admin/deactivateModule/${data.id}`);
      router.refresh();
      toast({
        variant: "success",
        title: t("success"),
        description: t("moduleDeactivated"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("moduleDeactivateError"),
      });
    }
  };

  const onDelete = async () => {
    try {
      await axios.delete(`/api/admin/deleteModule/${data.id}`);
      setDeleteDialogOpen(false);
      router.refresh();
      toast({
        variant: "success",
        title: t("success"),
        description: t("moduleDeleted"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("moduleDeleteError"),
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="h-8 w-8 p-0">
            <span className="sr-only">{t("openMenu")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
          {!data.enabled && (
            <DropdownMenuItem onClick={() => onActivate()}>
              <PowerIcon className="mr-2 w-4 h-4" />
              {t("activate")}
            </DropdownMenuItem>
          )}
          {data.enabled && (
            <DropdownMenuItem onClick={() => onDeactivate()}>
              <PowerOffIcon className="mr-2 w-4 h-4" />
              {t("deactivate")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 w-4 h-4" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("areYouSure")}</DialogTitle>
            <DialogDescription>
              {t("deleteModuleWarning", { name: data.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
