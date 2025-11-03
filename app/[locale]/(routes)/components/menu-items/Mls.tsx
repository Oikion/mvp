"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const MlsModuleMenu = ({
  open,
  localizations,
}: {
  open: boolean;
  localizations: any;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isPath = pathname.includes("mls");
  return (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isPath ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
        >
          <Home className="size-4" />
          <span className={open ? "" : "hidden"}>
            {localizations?.title ?? "Properties"}
          </span>
        </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem onClick={() => router.push("/mls/properties")}>
          {localizations?.properties ?? "Properties"}
        </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
};

export default MlsModuleMenu;


