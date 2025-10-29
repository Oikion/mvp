"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const MlsModuleMenu = ({ open, localizations }: { open: boolean; localizations: any }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isPath = pathname.includes("mls");
  return (
    <div className={`flex flex-row items-center mx-auto p-2 ${isPath ? "text-muted-foreground" : null}`}>
      <DropdownMenu>
        <DropdownMenuTrigger className={open ? "w-full hover:bg-slate-700 hover:text-gray-200 hover:transition hover:duration-150 rounded-md mx-auto" : ""}>
          <div className="flex gap-2 p-2">
            <Home />
            <span className={open ? "" : "hidden"}>{localizations?.title ?? "Properties"}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[250px] ml-10">
          <DropdownMenuItem onClick={() => router.push("/mls/dashboard")}>Dashboard</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/mls/properties")}>{localizations?.properties ?? "Properties"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MlsModuleMenu;


