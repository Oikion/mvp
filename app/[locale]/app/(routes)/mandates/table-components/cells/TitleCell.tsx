"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface TitleCellProps {
  mandateId: string;
  value: string | null | undefined;
}

export const TitleCell = ({ mandateId, value }: TitleCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [loading, setLoading] = useState(false);
  // Guard against onBlur firing a save after Escape: handleCancel sets this to
  // true, handleSave checks it immediately and bails out, and onClick resets it.
  const cancelledRef = useRef(false);
  const tCommon = useTranslations("common");

  const handleSave = async () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue(value ?? "");
      setIsEditing(false);
      return;
    }
    if (trimmed === (value ?? "").trim()) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateMandate({ id: mandateId, title: trimmed });
      toast.success(tCommon("success"));
    } catch {
      toast.error(tCommon("error"));
      setInputValue(value ?? "");
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setInputValue(value ?? "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={loading}
        autoFocus
        className="h-7 min-w-[160px] px-2 py-0 text-sm border-input"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="font-medium truncate max-w-[200px] cursor-pointer hover:text-primary hover:underline decoration-dotted underline-offset-2 transition-colors"
        onClick={() => {
          cancelledRef.current = false;
          setInputValue(value ?? "");
          setIsEditing(true);
        }}
        title={tCommon("edit")}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </span>
      <Link
        href={`/app/mandates/${mandateId}`}
        className="ml-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
        title="View details"
        onClick={(e) => e.stopPropagation()}
      >
        &#x2197;
      </Link>
    </div>
  );
};
