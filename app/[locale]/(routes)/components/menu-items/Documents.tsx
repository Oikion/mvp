"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/navigation";

type Props = {
  open: boolean;
  title: string;
};

const DocumentsMenu = ({ open, title }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("/documents");

  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href="/documents">
        <FileText className="size-4" />
        <span className={open ? "" : "hidden"}>{title}</span>
      </Link>
    </Button>
  );
};

export default DocumentsMenu;

