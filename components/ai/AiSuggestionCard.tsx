// @ts-nocheck
// TODO: Fix type errors
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  actionLabel?: string;
}

interface AiSuggestionCardProps {
  readonly title: string;
  readonly suggestions: AiSuggestion[];
  readonly onDismiss?: () => void;
  readonly className?: string;
  readonly collapsible?: boolean;
  readonly defaultCollapsed?: boolean;
}

export function AiSuggestionCard({
  title,
  suggestions,
  onDismiss,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: AiSuggestionCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleAction = async (suggestion: AiSuggestion) => {
    if (!suggestion.action) return;

    setLoadingId(suggestion.id);
    try {
      await suggestion.action();
      setCompletedIds((prev) => new Set([...prev, suggestion.id]));
      toast.success("Action completed");
    } catch (error) {
      console.error("Suggestion action error:", error);
      toast.error("Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !completedIds.has(s.id)
  );

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {collapsible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-3">
          {visibleSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background/50 border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {suggestion.description}
                </p>
              </div>
              {suggestion.action && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={loadingId === suggestion.id}
                  onClick={() => handleAction(suggestion)}
                >
                  {loadingId === suggestion.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : completedIds.has(suggestion.id) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    suggestion.actionLabel || "Apply"
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
