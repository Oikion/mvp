"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

import { usePathname, useRouter } from "next/navigation";

type Props = {
  open: boolean;
  localizations: any;
};

const CrmModuleMenu = ({ open, localizations }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const isPath = pathname.includes("crm");

  return (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isPath ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
        >
          <Coins className="size-4" />
            <span className={open ? "" : "hidden"}>{localizations.title}</span>
        </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuItem onClick={() => router.push("/crm/clients")}>
            {localizations.accounts}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
};

export default CrmModuleMenu;
