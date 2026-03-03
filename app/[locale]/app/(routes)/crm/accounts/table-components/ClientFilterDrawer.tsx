"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";

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

export interface ClientFilters {
  status: string[];
  clientType: string[];
  intent: string[];
  leadSource: string[];
  assignedTo: string;
  budgetMin: number | null;
  budgetMax: number | null;
}

interface ClientFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; name: string }[];
  activeFilters: ClientFilters;
  onApply: (filters: ClientFilters) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

const CLIENT_TYPE_OPTIONS = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "RENTER", label: "Renter" },
  { value: "INVESTOR", label: "Investor" },
  { value: "REFERRAL_PARTNER", label: "Referral Partner" },
];

const INTENT_OPTIONS = [
  { value: "BUY", label: "Buy" },
  { value: "RENT", label: "Rent" },
  { value: "SELL", label: "Sell" },
  { value: "LEASE", label: "Lease" },
  { value: "INVEST", label: "Invest" },
];

const LEAD_SOURCE_OPTIONS = [
  { value: "REFERRAL", label: "Referral" },
  { value: "WEB", label: "Web" },
  { value: "PORTAL", label: "Portal" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "SOCIAL", label: "Social" },
];

function countActiveFilters(filters: ClientFilters): number {
  let count = 0;
  if (filters.status.length > 0) count++;
  if (filters.clientType.length > 0) count++;
  if (filters.intent.length > 0) count++;
  if (filters.leadSource.length > 0) count++;
  if (filters.assignedTo) count++;
  if (filters.budgetMin !== null) count++;
  if (filters.budgetMax !== null) count++;
  return count;
}

interface CheckboxGroupProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function CheckboxGroup({ label, options, selected, onChange }: CheckboxGroupProps) {
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
            Clear
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

const EMPTY_FILTERS: ClientFilters = {
  status: [],
  clientType: [],
  intent: [],
  leadSource: [],
  assignedTo: "",
  budgetMin: null,
  budgetMax: null,
};

export function ClientFilterDrawer({
  open,
  onOpenChange,
  users,
  activeFilters,
  onApply,
  onReset,
}: ClientFilterDrawerProps) {
  const [localFilters, setLocalFilters] = React.useState<ClientFilters>(activeFilters);

  // Sync local state whenever the drawer opens with the current active filters
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
              <SheetTitle>Filters</SheetTitle>
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
            label="Status"
            options={STATUS_OPTIONS}
            selected={localFilters.status}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, status: values }))
            }
          />

          <Separator />

          {/* Client Type */}
          <CheckboxGroup
            label="Client Type"
            options={CLIENT_TYPE_OPTIONS}
            selected={localFilters.clientType}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, clientType: values }))
            }
          />

          <Separator />

          {/* Intent */}
          <CheckboxGroup
            label="Intent"
            options={INTENT_OPTIONS}
            selected={localFilters.intent}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, intent: values }))
            }
          />

          <Separator />

          {/* Lead Source */}
          <CheckboxGroup
            label="Lead Source"
            options={LEAD_SOURCE_OPTIONS}
            selected={localFilters.leadSource}
            onChange={(values) =>
              setLocalFilters((prev) => ({ ...prev, leadSource: values }))
            }
          />

          <Separator />

          {/* Assigned To */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Assigned To</h4>
              {localFilters.assignedTo && (
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, assignedTo: "" }))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
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
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__anyone__">Anyone</SelectItem>
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
              <h4 className="text-sm font-medium">Budget Range</h4>
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
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
                <Input
                  type="number"
                  placeholder="Min"
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
              <span className="text-muted-foreground text-sm shrink-0">—</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
                <Input
                  type="number"
                  placeholder="Max"
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
            Reset All
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
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
