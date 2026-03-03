"use client";

import { useState, useRef } from "react";
import { updateClient } from "@/actions/crm/update-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface NameCellProps {
  clientId: string;
  value: string | null | undefined;
}

export const NameCell = ({ clientId, value }: NameCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? "");
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      // Validation: name must not be empty — revert
      setInputValue(value ?? "");
      setIsEditing(false);
      return;
    }
    // No change — skip the network call
    if (trimmed === (value ?? "").trim()) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await updateClient(clientId, { client_name: trimmed });
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
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={loading}
        autoFocus
        className="h-7 min-w-[120px] px-2 py-0 text-sm border-input"
      />
    );
  }

  return (
    <div
      className="whitespace-nowrap cursor-pointer hover:text-primary hover:underline decoration-dotted underline-offset-2 transition-colors"
      onClick={() => {
        setInputValue(value ?? "");
        setIsEditing(true);
      }}
      title={tCommon("edit")}
    >
      {value || <span className="text-muted-foreground">—</span>}
    </div>
  );
};
