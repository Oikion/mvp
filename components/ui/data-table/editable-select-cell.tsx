"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditableSelectCellProps {
  value: string | null;
  onSave: (value: string | null) => Promise<void>;
  options: { value: string; label: string }[];
  placeholder?: string;
  nullLabel?: string;
  width?: string;
}

export const EditableSelectCell = ({
  value,
  onSave,
  options,
  placeholder = "Select...",
  nullLabel = "Unassigned",
  width = "180px",
}: EditableSelectCellProps) => {
  const [loading, setLoading] = useState(false);

  const currentValue = value || "___null___";

  const handleValueChange = async (newValue: string) => {
    const resolved = newValue === "___null___" ? null : newValue;
    if (resolved === value) return;
    setLoading(true);
    try {
      await onSave(resolved);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger
          className={`h-8 border-none bg-transparent shadow-none hover:bg-muted/50 focus:ring-0 px-2`}
          style={{ width }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="___null___">{nullLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
