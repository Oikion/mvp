"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Wrench } from "lucide-react";
import type { Dictionary } from "@/dictionaries";

interface ToolCall {
  name: string;
  success: boolean;
  error?: string;
}

interface ToolResultDisplayProps {
  toolCalls: ToolCall[];
  dict: Dictionary;
}

// Fallback tool labels (used when translations are not available)
const fallbackToolLabels: Record<string, string> = {
  list_clients: "Listed clients",
  create_client: "Created client",
  search_clients: "Searched clients",
  get_client_details: "Retrieved client details",
  list_properties: "Listed properties",
  create_property: "Created property",
  search_properties: "Searched properties",
  list_events: "Listed calendar events",
  create_event: "Created calendar event",
  query_calendar: "Queried calendar",
  list_tasks: "Listed tasks",
  create_task: "Created task",
  list_documents: "Listed documents",
  analyze_document: "Analyzed document",
  find_matches_for_client: "Found matching properties",
  find_matches_for_property: "Found matching clients",
  link_entities: "Linked entities",
  draft_message_response: "Drafted message",
  get_upcoming_birthdays: "Retrieved upcoming birthdays",
};

export function ToolResultDisplay({ toolCalls, dict }: ToolResultDisplayProps) {
  const t = dict.ai || {};
  const toolLabels = (t.toolLabels || {}) as Record<string, string>;

  if (toolCalls.length === 0) return null;

  const getToolLabel = (toolName: string): string => {
    return toolLabels[toolName] || fallbackToolLabels[toolName] || toolName;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wrench className="h-3 w-3" />
        <span>{t.actionsPerformed || "Actions performed"}</span>
      </div>
      <div className="space-y-1">
        {toolCalls.map((tool, index) => (
          <div
            key={`${tool.name}-${index}`}
            className={cn(
              "flex items-center gap-2 text-xs rounded-md px-2 py-1",
              tool.success
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {tool.success ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{getToolLabel(tool.name)}</span>
            {tool.error && (
              <span className="text-destructive ml-auto truncate max-w-[200px]">
                {tool.error}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
