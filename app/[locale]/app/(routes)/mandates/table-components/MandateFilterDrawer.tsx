"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MandateFilters {
  status: string[];
  urgency: string[];
  transactionType: string[];
  propertyType: string[];
  linkedStatus: string;
  assignedTo: string;
  budgetMin: number | null;
  budgetMax: number | null;
}

interface MandateFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; name: string }[];
  activeFilters: MandateFilters;
  onApply: (filters: MandateFilters) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", labelKey: "MandateForm.status.DRAFT" },
  { value: "ACTIVE", labelKey: "MandateForm.status.ACTIVE" },
  { value: "PAUSED", labelKey: "MandateForm.status.PAUSED" },
  { value: "FULFILLED", labelKey: "MandateForm.status.FULFILLED" },
  { value: "EXPIRED", labelKey: "MandateForm.status.EXPIRED" },
  { value: "CANCELLED", labelKey: "MandateForm.status.CANCELLED" },
];

const URGENCY_OPTIONS = [
  { value: "LOW", labelKey: "MandateForm.urgency.LOW" },
  { value: "MEDIUM", labelKey: "MandateForm.urgency.MEDIUM" },
  { value: "HIGH", labelKey: "MandateForm.urgency.HIGH" },
  { value: "CRITICAL", labelKey: "MandateForm.urgency.CRITICAL" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: "SALE", labelKey: "MandateForm.transactionType.SALE" },
  { value: "RENTAL", labelKey: "MandateForm.transactionType.RENTAL" },
  { value: "SHORT_TERM", labelKey: "MandateForm.transactionType.SHORT_TERM" },
  { value: "EXCHANGE", labelKey: "MandateForm.transactionType.EXCHANGE" },
  { value: "AUCTION", labelKey: "MandateForm.transactionType.AUCTION" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "APARTMENT", labelKey: "MandateForm.propertyType.APARTMENT" },
  { value: "HOUSE", labelKey: "MandateForm.propertyType.HOUSE" },
  { value: "MAISONETTE", labelKey: "MandateForm.propertyType.MAISONETTE" },
  { value: "COMMERCIAL", labelKey: "MandateForm.propertyType.COMMERCIAL" },
  { value: "PLOT", labelKey: "MandateForm.propertyType.PLOT" },
  { value: "WAREHOUSE", labelKey: "MandateForm.propertyType.WAREHOUSE" },
  { value: "PARKING", labelKey: "MandateForm.propertyType.PARKING" },
  { value: "FARM", labelKey: "MandateForm.propertyType.FARM" },
  { value: "INDUSTRIAL", labelKey: "MandateForm.propertyType.INDUSTRIAL" },
  { value: "OTHER", labelKey: "MandateForm.propertyType.OTHER" },
];

const LINKED_STATUS_OPTIONS = [
  { value: "", labelKey: "Filters.all" },
  { value: "linked", labelKey: "Filters.linked" },
  { value: "unlinked", labelKey: "Filters.unlinked" },
];

function countActiveFilters(filters: MandateFilters): number {
  let count = 0;
  if (filters.status.length > 0) count++;
  if (filters.urgency.length > 0) count++;
  if (filters.transactionType.length > 0) count++;
  if (filters.propertyType.length > 0) count++;
  if (filters.linkedStatus) count++;
  if (filters.assignedTo) count++;
  if (filters.budgetMin !== null) count++;
  if (filters.budgetMax !== null) count++;
  return count;
}

interface CheckboxGroupProps {
  label: string;
  clearLabel: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function CheckboxGroup({ label, clearLabel, options, selected, onChange }: CheckboxGroupProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{label}</h4>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {clearLabel}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`filter-${label}-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
            <Label
              htmlFor={`filter-${label}-${option.value}`}
              className="text-sm font-normal cursor-pointer leading-none"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FILTERS: MandateFilters = {
  status: [],
  urgency: [],
  transactionType: [],
  propertyType: [],
  linkedStatus: "",
  assignedTo: "",
  budgetMin: null,
  budgetMax: null,
};

export function MandateFilterDrawer({
  open,
  onOpenChange,
  users,
  activeFilters,
  onApply,
  onReset,
}: MandateFilterDrawerProps) {
  const t = useTranslations("mandates");
  const [localFilters, setLocalFilters] = React.useState<MandateFilters>(activeFilters);

  // Sync local state whenever the drawer opens
  React.useEffect(() => {
    if (open) {
      setLocalFilters(activeFilters);
    }
  }, [open, activeFilters]);

  const activeCount = countActiveFilters(activeFilters);

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilters(EMPTY_FILTERS);
    onReset();
    onOpenChange(false);
  };

  // Build translated options
  const statusOptions = STATUS_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  const urgencyOptions = URGENCY_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  const transactionTypeOptions = TRANSACTION_TYPE_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  const propertyTypeOptions = PROPERTY_TYPE_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] sm:max-w-[400px] flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
              <SheetTitle>{t("Filters.title")}</SheetTitle>
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeCount}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Status */}
          <CheckboxGroup
            label={t("Filters.status")}
            clearLabel={t("Filters.clear")}
            options={statusOptions}
            selected={localFilters.status}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, status: values }))
            }
          />

          <Separator />

          {/* Urgency */}
          <CheckboxGroup
            label={t("Filters.urgency")}
            clearLabel={t("Filters.clear")}
            options={urgencyOptions}
            selected={localFilters.urgency}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, urgency: values }))
            }
          />

          <Separator />

          {/* Transaction Type */}
          <CheckboxGroup
            label={t("Filters.transactionType")}
            clearLabel={t("Filters.clear")}
            options={transactionTypeOptions}
            selected={localFilters.transactionType}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, transactionType: values }))
            }
          />

          <Separator />

          {/* Property Type */}
          <CheckboxGroup
            label={t("Filters.propertyType")}
            clearLabel={t("Filters.clear")}
            options={propertyTypeOptions}
            selected={localFilters.propertyType}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, propertyType: values }))
            }
          />

          <Separator />

          {/* Client Link Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("Filters.linkedStatus")}</h4>
              {localFilters.linkedStatus && (
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, linkedStatus: "" }))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("Filters.clear")}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {LINKED_STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`filter-linked-${option.value || "all"}`}
                    checked={localFilters.linkedStatus === option.value}
                    onCheckedChange={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        linkedStatus: prev.linkedStatus === option.value ? "" : option.value,
                      }))
                    }
                  />
                  <Label
                    htmlFor={`filter-linked-${option.value || "all"}`}
                    className="text-sm font-normal cursor-pointer leading-none"
                  >
                    {t(option.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Assigned To */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("Filters.assignedTo")}</h4>
              {localFilters.assignedTo && (
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, assignedTo: "" }))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("Filters.clear")}
                </button>
              )}
            </div>
            <Select
              value={localFilters.assignedTo || "__anyone__"}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  assignedTo: value === "__anyone__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("Filters.anyone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__anyone__">{t("Filters.anyone")}</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Budget Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("Filters.budgetRange")}</h4>
              {(localFilters.budgetMin !== null || localFilters.budgetMax !== null) && (
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      budgetMin: null,
                      budgetMax: null,
                    }))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("Filters.clear")}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {"\u20AC"}
                </span>
                <Input
                  type="number"
                  placeholder={t("Filters.min")}
                  value={localFilters.budgetMin ?? ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      budgetMin: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="h-9 pl-7"
                  min={0}
                />
              </div>
              <span className="text-muted-foreground text-sm shrink-0">{"\u2014"}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {"\u20AC"}
                </span>
                <Input
                  type="number"
                  placeholder={t("Filters.max")}
                  value={localFilters.budgetMax ?? ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      budgetMax: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="h-9 pl-7"
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 shrink-0 flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReset}
          >
            <X className="h-4 w-4 mr-1.5" />
            {t("Filters.resetFilters")}
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            {t("Filters.apply")}
            {countActiveFilters(localFilters) > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-xs bg-primary-foreground/20 text-primary-foreground"
              >
                {countActiveFilters(localFilters)}
              </Badge>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
