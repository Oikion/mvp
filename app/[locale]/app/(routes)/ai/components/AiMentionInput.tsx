"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Users, Home, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients, useProperties, useDocuments } from "@/hooks/swr";
import { useCalendarEvents } from "@/hooks/swr/useCalendarEvents";
import { useMentionShortcut, type MentionCategory } from "@/hooks/use-mention-shortcut";
import type { Dictionary } from "@/dictionaries";

export interface MentionedEntity {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "document";
}

interface AiMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: MentionedEntity[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onSubmit: () => void;
  dict?: Dictionary;
}

export function AiMentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type @ to mention...",
  disabled,
  className,
  onSubmit,
  dict,
}: AiMentionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Get translations for mentions
  const t = dict?.ai?.mentions || {};
  const categories = (t as { categories?: Record<string, string> })?.categories || {};
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionedEntities, setMentionedEntities] = useState<MentionedEntity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mention shortcut store for quick entity selection
  const { setActiveInput } = useMentionShortcut();

  // Callback to insert mention from shortcut overlay
  const insertMentionFromShortcut = useCallback(
    (entityName: string, entityId: string, entityType: MentionCategory) => {
      if (!inputRef.current) return;

      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      // Insert @EntityName at cursor position
      const mentionText = `@${entityName} `;
      const newValue = value.substring(0, start) + mentionText + value.substring(end);

      onChange(newValue);

      // Map MentionCategory to MentionedEntity type
      const typeMap: Record<MentionCategory, MentionedEntity["type"]> = {
        clients: "client",
        properties: "property",
        documents: "document",
      };

      // Add to mentioned entities
      const newEntity: MentionedEntity = {
        id: entityId,
        name: entityName,
        type: typeMap[entityType],
      };

      const alreadyMentioned = mentionedEntities.some(
        (e) => e.id === entityId && e.type === newEntity.type
      );

      if (!alreadyMentioned) {
        const newMentionedEntities = [...mentionedEntities, newEntity];
        setMentionedEntities(newMentionedEntities);
        onMentionsChange(newMentionedEntities);
      }

      // Focus back and set cursor after mention
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = start + mentionText.length;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, onChange, mentionedEntities, onMentionsChange]
  );

  // Register/unregister with mention shortcut store on focus/blur
  const handleFocus = useCallback(() => {
    setActiveInput({
      ref: inputRef as React.RefObject<HTMLInputElement>,
      insertMention: insertMentionFromShortcut,
      cursorPosition,
    });
  }, [setActiveInput, insertMentionFromShortcut, cursorPosition]);

  const handleBlur = useCallback(() => {
    // Small delay to allow shortcut overlay to use the input before clearing
    setTimeout(() => {
      setActiveInput(null);
    }, 100);
  }, [setActiveInput]);

  // Fetch data from all sources
  const { clients, isLoading: clientsLoading } = useClients();
  const { properties, isLoading: propertiesLoading } = useProperties();
  const { documents, isLoading: documentsLoading } = useDocuments();
  const { events, isLoading: eventsLoading } = useCalendarEvents({
    includeTasks: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(position);

    // Check if user is typing @
    const textBeforeCursor = newValue.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // If there's no space after @, show suggestions
      const hasNoSeparator = !textAfterAt.includes(" ") && !textAfterAt.includes("(") && !textAfterAt.includes(")");
      
      if (hasNoSeparator) {
        setSearchQuery(textAfterAt);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const insertMention = (entity: MentionedEntity) => {
    if (!inputRef.current) {
      return;
    }

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
    
    const beforeAt = value.substring(0, lastAtIndex);
    const mentionText = `@${entity.name}`;
    const newValue = beforeAt + mentionText + " " + textAfterCursor;
    
    onChange(newValue);
    setIsOpen(false);
    setSearchQuery("");

    // Add to mentioned entities if not already present
    const newMentionedEntities = [...mentionedEntities];
    const alreadyMentioned = newMentionedEntities.some(e => e.id === entity.id && e.type === entity.type);
    
    if (!alreadyMentioned) {
      newMentionedEntities.push(entity);
      setMentionedEntities(newMentionedEntities);
      onMentionsChange(newMentionedEntities);
    }

      // Focus back on input and set cursor position
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = lastAtIndex + mentionText.length + 1;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isOpen) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Transform data to mention format
  const allOptions: MentionedEntity[] = [
    ...clients.map(c => ({ id: c.value, name: c.label, type: "client" as const })),
    ...properties.map(p => ({ id: p.value, name: p.label, type: "property" as const })),
    ...documents.map(d => ({ id: d.value, name: d.label, type: "document" as const })),
    ...events.map(e => ({ id: String(e.eventId || e.id), name: e.title, type: "event" as const })),
  ];

  const filteredOptions = allOptions.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedOptions = {
    clients: filteredOptions.filter((o) => o.type === "client").slice(0, 5),
    properties: filteredOptions.filter((o) => o.type === "property").slice(0, 5),
    documents: filteredOptions.filter((o) => o.type === "document").slice(0, 5),
    events: filteredOptions.filter((o) => o.type === "event").slice(0, 5),
  };

  const isLoading = clientsLoading || propertiesLoading || documentsLoading || eventsLoading;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSelect={(e) => {
              const target = e.target as HTMLInputElement;
              setCursorPosition(target.selectionStart || 0);
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent 
        className="w-[300px] p-0" 
        align="start"
        side="top"
        sideOffset={8}
      >
          <Command shouldFilter={false}>
            <CommandList>
              {(() => {
                if (isLoading) {
                  return (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {dict?.common?.loading || "Loading..."}
                    </div>
                  );
                }
                
                if (filteredOptions.length === 0) {
                  return <CommandEmpty>{(t as { noResults?: string })?.noResults || "No results found."}</CommandEmpty>;
                }
                
                return (
                  <>
                  {groupedOptions.clients.length > 0 && (
                    <CommandGroup heading={categories.clients || "Clients"}>
                      {groupedOptions.clients.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={`client-${option.id}`}
                          onSelect={() => insertMention(option)}
                          className="flex items-center gap-2"
                        >
                          <Users className="h-4 w-4 text-primary" />
                          {option.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {groupedOptions.properties.length > 0 && (
                    <CommandGroup heading={categories.properties || "Properties"}>
                      {groupedOptions.properties.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={`property-${option.id}`}
                          onSelect={() => insertMention(option)}
                          className="flex items-center gap-2"
                        >
                          <Home className="h-4 w-4 text-success" />
                          {option.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {groupedOptions.documents.length > 0 && (
                    <CommandGroup heading={categories.documents || "Documents"}>
                      {groupedOptions.documents.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={`document-${option.id}`}
                          onSelect={() => insertMention(option)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                          {option.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {groupedOptions.events.length > 0 && (
                    <CommandGroup heading={categories.events || "Events"}>
                      {groupedOptions.events.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={`event-${option.id}`}
                          onSelect={() => insertMention(option)}
                          className="flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4 text-purple-600" />
                          {option.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
                );
              })()}
            </CommandList>
          </Command>
        </PopoverContent>
    </Popover>
  );
}
