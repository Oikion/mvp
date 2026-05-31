"use client";

import axios from "axios";
import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useAppToast } from "@/hooks/use-app-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

import { taskSchema } from "../data/schema";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const task = taskSchema.parse(row.original);

  const { toast } = useAppToast();
  const t = useTranslations("crm");

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onDelete = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`/api/crm/tasks/`, {
        data: {
          id: task?.id,
          section: task?.section,
        },
      });
      toast.success(t("tasks.toast.taskDeleted"), { description: t("tasks.toast.taskDeletedDesc"), isTranslationKey: false });
      setOpen(false);
    } catch (error) {
      toast.error(t("tasks.toast.taskDeleteFailed"), { description: t("tasks.toast.taskDeleteFailedDesc"), isTranslationKey: false });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={t("tasks.rowActions.deleteTaskTitle")}
        description={t("tasks.rowActions.deleteTaskDescription")}
        onConfirm={onDelete}
        isLoading={isLoading}
        variant="danger"
        confirmLabel={t("tasks.rowActions.deleteConfirm")}
        loadingLabel={t("tasks.rowActions.deleting")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted pointer-coarse:min-h-11 pointer-coarse:min-w-11"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("tasks.rowActions.openMenu")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={() => router.push(`/app/crm/tasks/viewtask/${task?.id}`)}
          >
            {t("tasks.rowActions.view")}
          </DropdownMenuItem>
          {/*           <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem> */}
          <DropdownMenuSeparator />
          {/*  <DropdownMenuSub>
          <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={task.label}>
              {labels.map((label) => (
                <DropdownMenuRadioItem key={label.value} value={label.value}>
                  {label.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            {t("tasks.rowActions.delete")}
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
