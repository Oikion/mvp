"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateMandate } from "@/actions/mandates/update-mandate";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BudgetCellProps {
  mandateId: string;
  budgetMin: number | string | null | undefined;
  budgetMax: number | string | null | undefined;
}

function formatBudget(
  min?: number | string | null,
  max?: number | string | null,
  upToLabel?: string
): string {
  const minVal = min ? Number(min) : null;
  const maxVal = max ? Number(max) : null;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
    return `€${n.toLocaleString()}`;
  };

  if (minVal && maxVal) return `${fmt(minVal)} – ${fmt(maxVal)}`;
  if (minVal) return `${fmt(minVal)}+`;
  if (maxVal) return upToLabel ? `${upToLabel} ${fmt(maxVal)}` : `up to ${fmt(maxVal)}`;
  return "—";
}

export const BudgetCell = ({
  mandateId,
  budgetMin,
  budgetMax,
}: BudgetCellProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [minValue, setMinValue] = useState(budgetMin?.toString() ?? "");
  const [maxValue, setMaxValue] = useState(budgetMax?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const tCommon = useTranslations("common");
  const t = useTranslations("mandates");
  const minRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && minRef.current) {
      minRef.current.focus();
      minRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const parsedMin = minValue.trim() ? parseFloat(minValue.replace(/,/g, "")) : null;
    const parsedMax = maxValue.trim() ? parseFloat(maxValue.replace(/,/g, "")) : null;

    if (minValue.trim() && (parsedMin === null || isNaN(parsedMin))) {
      toast.error(t("MandateForm.validation.invalidMinBudget"));
      return;
    }
    if (maxValue.trim() && (parsedMax === null || isNaN(parsedMax))) {
      toast.error(t("MandateForm.validation.invalidMaxBudget"));
      return;
    }

    // No change — skip
    const origMin = budgetMin ? Number(budgetMin) : null;
    const origMax = budgetMax ? Number(budgetMax) : null;
    if (parsedMin === origMin && parsedMax === origMax) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await updateMandate({
        id: mandateId,
        budget_min: parsedMin,
        budget_max: parsedMax,
      } as any);
      toast.success(tCommon("success"));
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error(tCommon("error"));
      setMinValue(budgetMin?.toString() ?? "");
      setMaxValue(budgetMax?.toString() ?? "");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMinValue(budgetMin?.toString() ?? "");
    setMaxValue(budgetMax?.toString() ?? "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-1 min-w-[200px]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex-1">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            €
          </span>
          <Input
            ref={minRef}
            type="text"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 pl-5 pr-1 w-full text-sm"
            placeholder={t("Filters.min")}
            disabled={loading}
          />
        </div>
        <span className="text-muted-foreground text-xs">–</span>
        <div className="relative flex-1">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            €
          </span>
          <Input
            type="text"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 pl-5 pr-1 w-full text-sm"
            placeholder={t("Filters.max")}
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
        setMinValue(budgetMin?.toString() ?? "");
        setMaxValue(budgetMax?.toString() ?? "");
        setIsEditing(true);
      }}
      className="group flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 transition-colors text-left"
    >
      <span>{formatBudget(budgetMin, budgetMax, t("budget.upTo"))}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  );
};
