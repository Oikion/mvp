import Heading from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import React from "react";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  visibility?: "public" | "private";
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

const Container = ({
  title,
  description,
  visibility,
  headerExtra,
  children,
  ...props
}: ContainerProps) => {
  return (
    <div {...props} className={cn("flex flex-col", props.className)}>
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-4">
          <Heading
            title={title}
            description={description}
            visibility={visibility}
            level="h4"
          />
          {headerExtra && (
            <div className="shrink-0 pt-1">
              {headerExtra}
            </div>
          )}
        </div>
        <Separator className="mt-3" />
      </div>
      <div className="pb-6 pt-5 space-y-5 text-sm">
        {children}
      </div>
    </div>
  );
};

export default Container;
