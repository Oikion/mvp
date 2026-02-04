"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ConditionalFormSectionProps {
  condition: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ConditionalFormSection({
  condition,
  children,
  className,
}: ConditionalFormSectionProps) {
  if (!condition) return null;

  return <div className={cn(className)}>{children}</div>;
}

