"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TitleCellProps {
  mandateId: string;
  value: string | null | undefined;
}

export const TitleCell = ({ mandateId, value }: TitleCellProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error(tCommon("error"), { description: "Title is required" });
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
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error(tCommon("error"));
      setEditValue(value ?? "");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value ?? "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (isEditing && !loading) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-1 min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-8 px-2 w-full text-sm"
          placeholder="Mandate title"
          disabled={loading}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-success hover:text-success hover:bg-success/10 dark:hover:bg-success/20"
          onMouseDown={(e) => {
            e.preventDefault();
            handleSave();
          }}
          disabled={loading}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCancel();
          }}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditValue(value ?? "");
        setIsEditing(true);
      }}
      className="group flex items-center gap-2 font-medium truncate max-w-[200px] cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors text-left"
    >
      <span>{value || "—"}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
};
