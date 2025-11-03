import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface ContainerProps {
  title: string;
  description: string;
  visibility?: string;
  children: React.ReactNode;
}

const Container = ({
  title,
  description,
  visibility,
  children,
}: ContainerProps) => {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0">
        <Heading
          title={title}
          description={description}
          visibility={visibility}
        />
        <Separator className="mt-4" />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 pb-8 pt-6 space-y-5 text-sm">
        {children}
      </div>
    </div>
  );
};

export default Container;
