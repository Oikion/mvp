"use client";

import { useState } from "react";
import { Check, ChevronDown, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TagBadge } from "./TagBadge";

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string | null;
}

type FilterMode = "any" | "all";

interface TagFilterProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  filterMode?: FilterMode;
  onFilterModeChange?: (mode: FilterMode) => void;
  showModeToggle?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * TagFilter - Multi-select tag filter for list views
 * 
 * @example
 * <TagFilter
 *   availableTags={tags}
 *   selectedTagIds={selectedTags}
 *   onSelectionChange={setSelectedTags}
 *   showModeToggle
 * />
 */
export function TagFilter({
  availableTags,
  selectedTagIds,
  onSelectionChange,
  filterMode = "any",
  onFilterModeChange,
  showModeToggle = false,
  isLoading = false,
  placeholder = "Filter by tags",
  className,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedTagSet = new Set(selectedTagIds);

  // Filter by search
  const filteredTags = searchValue
    ? availableTags.filter((tag) =>
        tag.name.toLowerCase().includes(searchValue.toLowerCase())
      )
    : availableTags;

  // Group tags by category
  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    const category = tag.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const handleToggleTag = (tagId: string) => {
    if (selectedTagSet.has(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const selectedTags = availableTags.filter((t) => selectedTagSet.has(t.id));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 border-dashed",
              selectedTagIds.length > 0 && "bg-accent"
            )}
          >
            <TagIcon className="h-3.5 w-3.5" />
            {placeholder}
            {selectedTagIds.length > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {selectedTagIds.length}
                </Badge>
              </>
            )}
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading tags...
                </div>
              ) : filteredTags.length === 0 ? (
                <CommandEmpty>No tags found.</CommandEmpty>
              ) : (
                Object.entries(tagsByCategory).map(([category, tags]) => (
                  <CommandGroup key={category} heading={category}>
                    {tags.map((tag) => {
                      const isSelected = selectedTagSet.has(tag.id);
                      return (
                        <CommandItem
                          key={tag.id}
                          value={tag.name}
                          onSelect={() => handleToggleTag(tag.id)}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1">{tag.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))
              )}

              {selectedTagIds.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleClearAll}
                      className="justify-center text-center text-muted-foreground"
                    >
                      Clear filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>

          {/* Filter mode toggle */}
          {showModeToggle && selectedTagIds.length > 1 && onFilterModeChange && (
            <div className="border-t p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Match:</span>
                <div className="flex rounded-md border">
                  <button
                    type="button"
                    onClick={() => onFilterModeChange("any")}
                    className={cn(
                      "px-2 py-1 text-xs",
                      filterMode === "any"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    Any
                  </button>
                  <button
                    type="button"
                    onClick={() => onFilterModeChange("all")}
                    className={cn(
                      "px-2 py-1 text-xs",
                      filterMode === "all"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected tag badges (shown inline) */}
      {selectedTags.length > 0 && selectedTags.length <= 3 && (
        <div className="flex items-center gap-1">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              size="sm"
              onRemove={() => handleToggleTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Clear all button */}
      {selectedTagIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleClearAll}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear tag filters</span>
        </Button>
      )}
    </div>
  );
}
