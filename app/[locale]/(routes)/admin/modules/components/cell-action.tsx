"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, PowerIcon, PowerOffIcon, Trash2 } from "lucide-react";

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
  const { toast } = useToast();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const onActivate = async () => {
    try {
      await axios.post(`/api/admin/activateModule/${data.id}`);
      router.refresh();
      toast({
        title: "Success",
        description: "Module has been activated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while activating module. Please try again.",
      });
    }
  };

  const onDeactivate = async () => {
    try {
      await axios.post(`/api/admin/deactivateModule/${data.id}`);
      router.refresh();
      toast({
        title: "Success",
        description: "Module has been deactivated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deactivating module. Please try again.",
      });
    }
  };

  const onDelete = async () => {
    try {
      await axios.delete(`/api/admin/deleteModule/${data.id}`);
      setDeleteDialogOpen(false);
      router.refresh();
      toast({
        title: "Success",
        description: "Module has been deleted.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Something went wrong while deleting module. Please try again.",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {!data.enabled && (
            <DropdownMenuItem onClick={() => onActivate()}>
              <PowerIcon className="mr-2 w-4 h-4" />
              Activate
            </DropdownMenuItem>
          )}
          {data.enabled && (
            <DropdownMenuItem onClick={() => onDeactivate()}>
              <PowerOffIcon className="mr-2 w-4 h-4" />
              Deactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 w-4 h-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{data.name}</strong> module.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
