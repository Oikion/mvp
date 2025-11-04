"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import FeedbackForm from "./FeedbackForm";

interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackSheet = ({ open, onOpenChange }: FeedbackSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-[600px] sm:max-w-[600px] space-y-2 feedback-sheet">
        <SheetHeader>
          <SheetTitle>Feedback</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto">
          <FeedbackForm setOpen={onOpenChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackSheet;

