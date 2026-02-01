"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Sparkles,
  Users,
  Building2,
  Calendar,
  MessageSquare,
  FileText,
  Target,
  Send,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface CommandPaletteProps {
  dict?: Record<string, any>;
}

// Quick navigation items
const navigationItems = [
  { id: "ai", label: "AI Assistant", icon: Sparkles, path: "/app/ai" },
  { id: "properties", label: "Properties", icon: Building2, path: "/app/mls" },
  { id: "clients", label: "Clients", icon: Users, path: "/app/crm" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/app/calendar" },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/app/messages" },
  { id: "documents", label: "Documents", icon: FileText, path: "/app/documents" },
  { id: "matchmaking", label: "Matchmaking", icon: Target, path: "/app/matchmaking" },
];

// AI suggestion prompts
const aiSuggestions = [
  { prompt: "Find matching properties for my client", category: "matchmaking" },
  { prompt: "Show me my active listings", category: "mls" },
  { prompt: "Create a new client", category: "crm" },
  { prompt: "Schedule a property viewing", category: "calendar" },
  { prompt: "Draft a message to a client", category: "messages" },
  { prompt: "List upcoming events", category: "calendar" },
];

export function CommandPalette({ dict }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const router = useRouter();
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const t = dict?.ai?.commandPalette || {
    placeholder: "Ask AI anything or search...",
    title: "AI Assistant",
    recentCommands: "Recent commands",
    navigation: "Go to",
    suggestions: "AI Suggestions",
    askAi: "Ask AI",
    thinking: "Thinking...",
    close: "Close",
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      // Delay reset to allow animation
      const timeout = setTimeout(() => {
        setQuery("");
        setIsAiMode(false);
        setAiResponse(null);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Handle navigation
  const handleNavigate = useCallback((path: string) => {
    router.push(`/${locale}${path}`);
    setOpen(false);
  }, [router, locale]);

  // Handle AI query
  const handleAiQuery = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsAiMode(true);
    setIsLoading(true);
    setAiResponse(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          useTools: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      
      if (data.success && data.message) {
        setAiResponse(data.message.content);
        
        // If there were tool calls, show a toast
        if (data.toolCalls && data.toolCalls.length > 0) {
          const successCount = data.toolCalls.filter((t: { success: boolean }) => t.success).length;
          const actionWord = successCount === 1 ? "action" : "actions";
          toast.success(`Executed ${successCount} ${actionWord}`);
        }
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("AI query error:", error);
      toast.error("Failed to get AI response");
      setAiResponse("Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleAiQuery(query);
    }
  }, [query, handleAiQuery]);

  // Filter suggestions based on query
  const filteredNavigation = query 
    ? navigationItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : navigationItems;

  const filteredSuggestions = aiSuggestions.filter((item) =>
    item.prompt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl">
        <VisuallyHidden>
          <DialogTitle>{t.title}</DialogTitle>
        </VisuallyHidden>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {/* Input area */}
          <form onSubmit={handleSubmit}>
            <div className="flex items-center border-b px-3">
              <Sparkles className="mr-2 h-5 w-5 shrink-0 text-violet-500" />
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder={t.placeholder}
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {query && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </form>

          {/* AI Response area */}
          {isAiMode && (
            <div className="border-b p-4 bg-violet-50/50 dark:bg-violet-950/20">
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.thinking}</span>
                </div>
              )}
              {!isLoading && aiResponse && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>AI Response</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                  <button
                    onClick={() => handleNavigate("/app/ai")}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 mt-2"
                  >
                    Continue in AI Assistant
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Command list */}
          {!isAiMode && (
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found. Press Enter to ask AI.
              </Command.Empty>

              {/* AI Suggestions */}
              {filteredSuggestions.length > 0 && (
                <Command.Group heading={t.suggestions || "AI Suggestions"}>
                  {filteredSuggestions.map((item) => (
                    <Command.Item
                      key={item.prompt}
                      value={item.prompt}
                      onSelect={() => handleAiQuery(item.prompt)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      <span>{item.prompt}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Navigation */}
              {filteredNavigation.length > 0 && (
                <Command.Group heading={t.navigation || "Go to"}>
                  {filteredNavigation.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      onSelect={() => handleNavigate(item.path)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
                <span className="text-xs">⌘</span>K
              </kbd>
              <span>to toggle</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
                ↵
              </kbd>
              <span>to select</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Export a hook to programmatically open the command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
