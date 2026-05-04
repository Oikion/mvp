"use client";

import { useState } from "react";
import { Edit, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UpdateAccountForm, type AccountFormData } from "../../components/UpdateAccountForm";

interface AccountActionsProps {
  account: AccountFormData;
}

export function AccountActions({ account }: AccountActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const handleOpenChange = (value: boolean) => {
    setEditOpen(value);
    if (!value) {
      router.refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account actions">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={editOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="min-w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <UpdateAccountForm initialData={account} open={setEditOpen} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
