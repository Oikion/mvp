import { Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

import React from "react";

type Props = {
  open: boolean;
  title: string;
};

const DashboardMenu = ({ open, title }: Props) => {
  const pathname = usePathname();
  const isPath = pathname === "/";
  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href={"/"}>
        <Home className="size-4" />
        <span className={open ? "" : "hidden"}>{title}</span>
      </Link>
    </Button>
  );
};

export default DashboardMenu;
