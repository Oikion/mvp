"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { TagBadge, TagBadgeList } from "./TagBadge";
import type { EntityType, Tag } from "@/types/tags";

interface TagInputProps {
  entityId: string;
  entityType: EntityType;
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onCreateTag?: (name: string) => Promise<Tag | null>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * TagInput - Autocomplete input for adding/removing tags from an entity
 * 
 * @example
 * <TagInput
 *   entityId={propertyId}
 *   entityType="property"
 *   availableTags={allTags}
 *   selectedTags={propertyTags}
 *   onTagsChange={handleTagsChange}
 *   onCreateTag={handleCreateTag}
 * />
 */
export function TagInput({
  entityId,
  entityType,
  availableTags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  isLoading = false,
  placeholder = "Add tags...",
  className,
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTagIds = new Set(selectedTags.map((t) => t.id));

  // Filter available tags that aren't already selected
  const unselectedTags = availableTags.filter((tag) => !selectedTagIds.has(tag.id));

  // Filter by search
  const filteredTags = searchValue
    ? unselectedTags.filter((tag) =>
        tag.name.toLowerCase().includes(searchValue.toLowerCase())
      )
    : unselectedTags;

  // Check if we can create a new tag with this name
  const canCreate =
    onCreateTag &&
    searchValue.trim().length > 0 &&
    !availableTags.some(
      (tag) => tag.name.toLowerCase() === searchValue.toLowerCase()
    );

  // Group tags by category
  const tagsByCategory = filteredTags.reduce((acc, tag) => {
    const category = tag.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const handleSelectTag = useCallback(
    (tag: Tag) => {
      if (!selectedTagIds.has(tag.id)) {
        onTagsChange([...selectedTags, tag]);
      }
      setSearchValue("");
      setOpen(false);
    },
    [selectedTags, selectedTagIds, onTagsChange]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onTagsChange(selectedTags.filter((t) => t.id !== tagId));
    },
    [selectedTags, onTagsChange]
  );

  const handleCreateTag = useCallback(async () => {
    if (!onCreateTag || !searchValue.trim()) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchValue.trim());
      if (newTag) {
        onTagsChange([...selectedTags, newTag]);
        setSearchValue("");
        setOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  }, [onCreateTag, searchValue, selectedTags, onTagsChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <TagBadgeList
          tags={selectedTags}
          onRemove={disabled ? undefined : handleRemoveTag}
          size="md"
        />
      )}

      {/* Tag input with dropdown */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
                onClick={() => setOpen(true)}
                disabled={isLoading}
              >
                <Plus className="h-3.5 w-3.5" />
                {placeholder}
              </Button>
            </div>
          </PopoverAnchor>
          <PopoverContent
            className="w-[250px] p-0"
            align="start"
            side="bottom"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
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
                ) : filteredTags.length === 0 && !canCreate ? (
                  <CommandEmpty>No tags found.</CommandEmpty>
                ) : (
                  <>
                    {Object.entries(tagsByCategory).map(([category, tags]) => (
                      <CommandGroup key={category} heading={category}>
                        {tags.map((tag) => (
                          <CommandItem
                            key={tag.id}
                            value={tag.name}
                            onSelect={() => handleSelectTag(tag)}
                            className="flex items-center gap-2"
                          >
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="flex-1">{tag.name}</span>
                            {selectedTagIds.has(tag.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}

                    {/* Create new tag option */}
                    {canCreate && (
                      <>
                        {filteredTags.length > 0 && <CommandSeparator />}
                        <CommandGroup>
                          <CommandItem
                            value={`create-${searchValue}`}
                            onSelect={handleCreateTag}
                            className="flex items-center gap-2"
                            disabled={isCreating}
                          >
                            <Plus className="h-4 w-4" />
                            <span>
                              Create &quot;{searchValue}&quot;
                            </span>
                          </CommandItem>
                        </CommandGroup>
                      </>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
