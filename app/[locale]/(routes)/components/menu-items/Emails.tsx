import { Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
};

const EmailsModuleMenu = ({ open, title }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("emails");

  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href={"/emails"}>
        <Mail className="size-4" />
        <span className={open ? "" : "hidden"}>{title}</span>
      </Link>
    </Button>
  );
};

export default EmailsModuleMenu;
