import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
};

const EmployeesModuleMenu = ({ open }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("employees");

  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href={"/employees"}>
        <Users className="size-4" />
        <span className={open ? "" : "hidden"}>Employees</span>
      </Link>
    </Button>
  );
};

export default EmployeesModuleMenu;
