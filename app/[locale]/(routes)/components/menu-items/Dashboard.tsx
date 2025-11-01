import { Home } from "lucide-react";
import { Link, usePathname } from "@/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

import React from "react";

type Props = {
  open: boolean;
  title: string;
};

const DashboardMenu = ({ open, title }: Props) => {
  const pathname = usePathname();
  const locale = useLocale();
  const isPath = pathname === `/${locale}` || pathname === `/${locale}/`;
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
