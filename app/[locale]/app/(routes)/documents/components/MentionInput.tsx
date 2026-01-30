"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Users, Home, Calendar, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MentionOption {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "task";
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  options: MentionOption[];
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  options,
  placeholder = "Type @ to mention...",
  className,
}: MentionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(position);

    // Check if user is typing @
    const textBeforeCursor = newValue.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // If there's no space after @, show suggestions
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("(") && !textAfterAt.includes(")")) {
        setSearchQuery(textAfterAt);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const insertMention = (option: MentionOption) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const beforeAt = value.substring(0, lastAtIndex);
      const mentionText = `@(${option.name})`;
      const newValue = beforeAt + mentionText + " " + textAfterCursor;
      
      onChange(newValue);
      setIsOpen(false);
      setSearchQuery("");

      // Focus back on textarea and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = lastAtIndex + mentionText.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedOptions = {
    clients: filteredOptions.filter((o) => o.type === "client"),
    properties: filteredOptions.filter((o) => o.type === "property"),
    events: filteredOptions.filter((o) => o.type === "event"),
    tasks: filteredOptions.filter((o) => o.type === "task"),
  };

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onSelect={(e) => {
          const target = e.target as HTMLTextAreaElement;
          setCursorPosition(target.selectionStart || 0);
        }}
        placeholder={placeholder}
        className="min-h-[100px]"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="absolute bottom-full left-0 mb-2 w-full" />
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandList>
                {groupedOptions.clients.length > 0 && (
                  <CommandGroup heading="Clients">
                    {groupedOptions.clients.map((option) => (
                      <CommandItem
                        key={option.id}
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
                  <CommandGroup heading="Properties">
                    {groupedOptions.properties.map((option) => (
                      <CommandItem
                        key={option.id}
                        onSelect={() => insertMention(option)}
                        className="flex items-center gap-2"
                      >
                        <Home className="h-4 w-4 text-success" />
                        {option.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {groupedOptions.events.length > 0 && (
                  <CommandGroup heading="Events">
                    {groupedOptions.events.map((option) => (
                      <CommandItem
                        key={option.id}
                        onSelect={() => insertMention(option)}
                        className="flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4 text-purple-600" />
                        {option.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {groupedOptions.tasks.length > 0 && (
                  <CommandGroup heading="Tasks">
                    {groupedOptions.tasks.map((option) => (
                      <CommandItem
                        key={option.id}
                        onSelect={() => insertMention(option)}
                        className="flex items-center gap-2"
                      >
                        <CheckSquare className="h-4 w-4 text-warning" />
                        {option.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandEmpty>No results found.</CommandEmpty>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

