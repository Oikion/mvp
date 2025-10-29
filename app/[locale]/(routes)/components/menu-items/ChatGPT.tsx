"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
};

const ChatGPTModuleMenu = ({ open }: Props) => {
  const pathname = usePathname();
  const isPath = pathname.includes("openAi");
  return (
    <Button
      asChild
      variant={isPath ? "secondary" : "ghost"}
      className="w-full justify-start gap-2"
    >
      <Link href={"/openAi"}>
        <Bot className="size-4" />
        <span className={open ? "" : "hidden"}>ChatGPT</span>
      </Link>
    </Button>
  );
};

export default ChatGPTModuleMenu;
