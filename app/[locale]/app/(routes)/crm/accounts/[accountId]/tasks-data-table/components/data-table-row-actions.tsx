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
      toast.success("Task deleted", { description: "Task deleted successfully", isTranslationKey: false });
      setOpen(false);
    } catch (error) {
      toast.error("Task deletion failed", { description: "Something went wrong while deleting the task", isTranslationKey: false });
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
        title="Delete Task"
        description="This action cannot be undone. The task will be permanently deleted."
        onConfirm={onDelete}
        isLoading={isLoading}
        variant="danger"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            onClick={() => router.push(`/app/crm/tasks/viewtask/${task?.id}`)}
          >
            View
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
            Delete
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
