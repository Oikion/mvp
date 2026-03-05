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
  initialFeedbackType?: string;
  initialFeedback?: string;
}

const FeedbackSheet = ({ open, onOpenChange, initialFeedbackType, initialFeedback }: FeedbackSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-[600px] sm:max-w-[600px] space-y-2 feedback-sheet">
        <SheetHeader>
          <SheetTitle>Feedback</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto">
          <FeedbackForm
            setOpen={onOpenChange}
            initialFeedbackType={initialFeedbackType}
            initialFeedback={initialFeedback}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackSheet;

