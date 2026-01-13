import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
};

const EmployeesModuleMenu = ({ open }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("employees");
  const t = useTranslations();

  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href={"/employees"}>
        <Users className="size-4" />
        <span className={open ? "" : "hidden"}>{t("ModuleMenu.employees")}</span>
      </Link>
    </Button>
  );
};

export default EmployeesModuleMenu;
