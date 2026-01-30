import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface ContainerProps {
  title: string;
  description: string;
  visibility?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

const Container = ({
  title,
  description,
  visibility,
  headerExtra,
  children,
}: ContainerProps) => {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-4">
          <Heading
            title={title}
            description={description}
            visibility={visibility}
          />
          {headerExtra && (
            <div className="shrink-0 pt-1">
              {headerExtra}
            </div>
          )}
        </div>
        <Separator className="mt-4" />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 pb-8 pt-6 space-y-5 text-sm">
        {children}
      </div>
    </div>
  );
};

export default Container;
