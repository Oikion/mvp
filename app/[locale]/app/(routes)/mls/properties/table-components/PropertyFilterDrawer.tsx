"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PropertyFilters {
  status: string[];
  propertyType: string[];
  transactionType: string[];
  priceMin: number | null;
  priceMax: number | null;
  municipality: string;
  assignedTo: string;
}

export const EMPTY_FILTERS: PropertyFilters = {
  status: [],
  propertyType: [],
  transactionType: [],
  priceMin: null,
  priceMax: null,
  municipality: "",
  assignedTo: "",
};

interface PropertyFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: { id: string; name: string; imageUrl?: string }[];
  activeFilters: PropertyFilters;
  onApply: (filters: PropertyFilters) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SOLD", label: "Sold" },
  { value: "OFF_MARKET", label: "Off Market" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const PROPERTY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PARKING", label: "Parking" },
  { value: "PLOT", label: "Plot" },
  { value: "FARM", label: "Farm" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Other" },
];

const TRANSACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "SALE", label: "Sale" },
  { value: "RENTAL", label: "Rental" },
  { value: "SHORT_TERM", label: "Short Term" },
  { value: "EXCHANGE", label: "Exchange" },
];

function countActiveFilters(filters: PropertyFilters): number {
  return [
    filters.status.length > 0,
    filters.propertyType.length > 0,
    filters.transactionType.length > 0,
    filters.priceMin !== null,
    filters.priceMax !== null,
    filters.municipality !== "",
    filters.assignedTo !== "",
  ].filter(Boolean).length;
}

function MultiCheckboxSection({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <Checkbox
            id={`filter-${opt.value}`}
            checked={selected.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
          />
          <Label
            htmlFor={`filter-${opt.value}`}
            className="cursor-pointer font-normal text-sm"
          >
            {opt.label}
          </Label>
        </div>
      ))}
    </div>
  );
}

export function PropertyFilterDrawer({
  open,
  onOpenChange,
  users,
  activeFilters,
  onApply,
  onReset,
}: PropertyFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(activeFilters);

  // Sync local state when drawer opens or active filters change externally
  useEffect(() => {
    if (open) {
      setLocalFilters(activeFilters);
    }
  }, [open, activeFilters]);

  const activeCount = countActiveFilters(localFilters);

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilters(EMPTY_FILTERS);
    onReset();
    onOpenChange(false);
  };

  const setField = <K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:w-[420px] sm:max-w-[420px] p-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                {activeCount} active
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable filter content */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <Accordion type="multiple" defaultValue={["status", "propertyType", "transactionType", "price", "municipality", "assignedTo"]} className="w-full">
            {/* Status */}
            <AccordionItem value="status">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Status / Κατάσταση
                  {localFilters.status.length > 0 && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      {localFilters.status.length}
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <MultiCheckboxSection
                  options={STATUS_OPTIONS}
                  selected={localFilters.status}
                  onChange={(v) => setField("status", v)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Property Type */}
            <AccordionItem value="propertyType">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Type / Τύπος
                  {localFilters.propertyType.length > 0 && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      {localFilters.propertyType.length}
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <MultiCheckboxSection
                  options={PROPERTY_TYPE_OPTIONS}
                  selected={localFilters.propertyType}
                  onChange={(v) => setField("propertyType", v)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Transaction Type */}
            <AccordionItem value="transactionType">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Transaction / Συναλλαγή
                  {localFilters.transactionType.length > 0 && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      {localFilters.transactionType.length}
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <MultiCheckboxSection
                  options={TRANSACTION_TYPE_OPTIONS}
                  selected={localFilters.transactionType}
                  onChange={(v) => setField("transactionType", v)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Price Range */}
            <AccordionItem value="price">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Price Range / Εύρος Τιμής
                  {(localFilters.priceMin !== null || localFilters.priceMax !== null) && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      set
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Min €</Label>
                    <Input
                      type="number"
                      placeholder="Min €"
                      min={0}
                      value={localFilters.priceMin ?? ""}
                      onChange={(e) =>
                        setField(
                          "priceMin",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Max €</Label>
                    <Input
                      type="number"
                      placeholder="Max €"
                      min={0}
                      value={localFilters.priceMax ?? ""}
                      onChange={(e) =>
                        setField(
                          "priceMax",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Municipality */}
            <AccordionItem value="municipality">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Municipality / Δήμος
                  {localFilters.municipality !== "" && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      set
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Input
                  placeholder="e.g. Athens"
                  value={localFilters.municipality}
                  onChange={(e) => setField("municipality", e.target.value)}
                  className="h-9"
                />
              </AccordionContent>
            </AccordionItem>

            {/* Assigned To */}
            <AccordionItem value="assignedTo" className="border-b-0">
              <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  Assigned To / Ανατέθηκε σε
                  {localFilters.assignedTo !== "" && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-xs font-normal">
                      set
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Select
                  value={localFilters.assignedTo || "__anyone__"}
                  onValueChange={(v) =>
                    setField("assignedTo", v === "__anyone__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 w-full">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Footer — pb-20 ensures clearance above the floating action button */}
        <SheetFooter className="px-6 py-4 pb-20 border-t shrink-0 flex flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0.5 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
