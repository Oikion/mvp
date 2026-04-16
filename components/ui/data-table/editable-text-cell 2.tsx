"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EditableTextCellProps {
  value: string | number | null | undefined;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "number" | "email";
  placeholder?: string;
  prefix?: string;
  required?: boolean;
  validate?: (value: string) => string | null;
  formatDisplay?: (value: string | number | null | undefined) => string;
  className?: string;
}

export const EditableTextCell = ({
  value,
  onSave,
  type = "text",
  placeholder = "",
  prefix,
  required = false,
  validate,
  formatDisplay,
  className,
}: EditableTextCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : value?.toString() || "—";

  const handleSave = async () => {
    const trimmed = editValue.trim();

    if (required && !trimmed) {
      toast.error("This field is required");
      return;
    }

    if (validate) {
      const error = validate(trimmed);
      if (error) {
        toast.error(error);
        return;
      }
    }

    // No change — skip
    if (trimmed === (value?.toString() ?? "").trim()) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      setEditValue(value?.toString() ?? "");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() ?? "");
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
        className="flex items-center gap-1 min-w-[140px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={prefix ? "relative flex-1" : "flex-1"}>
          {prefix && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {prefix}
            </span>
          )}
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={`h-8 w-full text-sm ${prefix ? "pl-6 pr-2" : "px-2"}`}
            placeholder={placeholder}
            disabled={loading}
          />
        </div>
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
        setEditValue(value?.toString() ?? "");
        setIsEditing(true);
      }}
      className={`group flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors text-left ${className ?? ""}`}
    >
      <span>{displayValue}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
};
