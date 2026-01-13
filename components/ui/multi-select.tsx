"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  loadingMessage = "Loading...",
  disabled = false,
  isLoading = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => 
      opt.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = useCallback((currentValue: string) => {
    const newValue = safeValue.includes(currentValue)
      ? safeValue.filter((val) => val !== currentValue)
      : [...safeValue, currentValue];
    onChange(newValue);
  }, [safeValue, onChange]);

  const handleRemove = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(safeValue.filter((val) => val !== valToRemove));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-10 h-auto",
            !safeValue.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {safeValue.length > 0 ? (
              safeValue.map((val) => {
                const option = options.find((opt) => opt.value === val);
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="mr-1 mb-1"
                  >
                    {option?.label || val}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Remove"
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex items-center justify-center"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(val, e as unknown as React.MouseEvent);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(val, e);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(val, e);
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </div>
                  </Badge>
                );
              })
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {loadingMessage}
            </div>
          ) : filteredOptions.length === 0 ? (
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          ) : (
            <ScrollArea className="h-64">
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = safeValue.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 flex-shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

