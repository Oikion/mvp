"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Loader2,
  X,
  ChevronRight,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AiContextPanelProps {
  readonly context: {
    type: "client" | "property" | "document" | "message" | "event";
    id: string;
    name: string;
    data?: Record<string, unknown>;
  };
  readonly suggestions?: string[];
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly triggerLabel?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const defaultSuggestions: Record<string, string[]> = {
  client: [
    "Find matching properties for this client",
    "Summarize this client's preferences",
    "Draft a follow-up email",
    "What properties have they viewed?",
  ],
  property: [
    "Find clients interested in this property",
    "Generate a property description",
    "Suggest a listing price based on comparables",
    "Create an open house invitation",
  ],
  document: [
    "Summarize this document",
    "Extract key information",
    "What are the main terms?",
    "Who are the parties involved?",
  ],
  message: [
    "Draft a response",
    "Summarize this conversation",
    "What action items were discussed?",
    "Translate to English/Greek",
  ],
  event: [
    "Who should be invited?",
    "Find available time slots",
    "Send reminder to attendees",
    "Create follow-up tasks",
  ],
};

export function AiContextPanel({
  context,
  suggestions,
  className,
  triggerClassName,
  triggerLabel,
}: AiContextPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const contextSuggestions = suggestions || defaultSuggestions[context.type] || [];

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context-aware message
      const contextMessage = `Context: ${context.type} - "${context.name}" (ID: ${context.id})
${context.data ? `Data: ${JSON.stringify(context.data, null, 2)}` : ""}

User question: ${prompt}`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: contextMessage },
          ],
          useTools: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      if (data.success && data.message) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message.content },
        ]);

        if (data.toolCalls && data.toolCalls.length > 0) {
          const successCount = data.toolCalls.filter((t: { success: boolean }) => t.success).length;
          if (successCount > 0) {
            toast.success(`Executed ${successCount} action${successCount !== 1 ? "s" : ""}`);
          }
        }
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("AI context error:", error);
      toast.error("Failed to get AI response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [context, messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20 hover:border-violet-500/40",
            triggerClassName
          )}
        >
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span>{triggerLabel || "Ask AI"}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className={cn("w-[400px] sm:w-[540px] flex flex-col", className)}>
        <SheetHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Assistant
            </SheetTitle>
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearChat} 
                leftIcon={<X className="h-4 w-4" />}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Context: {context.type} - {context.name}
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {/* Messages or Suggestions */}
          <ScrollArea className="flex-1">
            {messages.length === 0 ? (
              <div className="space-y-4 p-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  <span>Suggested questions</span>
                </div>
                <div className="space-y-2">
                  {contextSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm flex items-center gap-2"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
