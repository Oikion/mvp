"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { User, Loader2, Users, Home, Calendar, FileText, Sparkles } from "lucide-react";
import { ToolResultsContainer, type ToolCallResult } from "@/components/ai/ToolResultCard";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/dictionaries";
import ReactMarkdown from "react-markdown";

interface MentionedEntity {
  id: string;
  name: string;
  type: "client" | "property" | "event" | "document";
}

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCallResult[];
  mentions?: MentionedEntity[];
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  dict: Dictionary;
  locale: string;
}

export function MessageList({ messages, isLoading, dict, locale }: MessageListProps) {
  const t = dict.ai || {};

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div
          key={`message-${index}-${message.role}`}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {/* Assistant Avatar */}
          {message.role !== "user" && (
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          )}

          {/* Message Content */}
          <div
            className={cn(
              "max-w-[85%] space-y-3",
              message.role === "user" && "flex flex-col items-end"
            )}
          >
            {/* Show mentioned entities if any */}
            {message.mentions && message.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.mentions.map((mention) => (
                  <Badge
                    key={`${mention.type}-${mention.id}`}
                    variant="outline"
                    className={cn(
                      "text-xs py-0.5 px-2",
                      mention.type === "client" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                      mention.type === "property" && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
                      mention.type === "event" && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
                      mention.type === "document" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    )}
                  >
                    {mention.type === "client" && <Users className="h-3 w-3 mr-1" />}
                    {mention.type === "property" && <Home className="h-3 w-3 mr-1" />}
                    {mention.type === "event" && <Calendar className="h-3 w-3 mr-1" />}
                    {mention.type === "document" && <FileText className="h-3 w-3 mr-1" />}
                    {mention.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={cn(
                "rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/70 rounded-bl-md"
              )}
            >
              {message.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0.5">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
            </div>
            
            {/* Show tool calls as inline cards */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolResultsContainer
                toolCalls={message.toolCalls}
                locale={locale}
                dict={dict}
              />
            )}
          </div>

          {/* User Avatar */}
          {message.role === "user" && (
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center shadow-sm">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="bg-muted/70 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.thinking || "Thinking..."}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
