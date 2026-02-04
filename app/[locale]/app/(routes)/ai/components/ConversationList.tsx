"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Dictionary } from "@/dictionaries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  dict: Dictionary;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  dict,
}: ConversationListProps) {
  const t = dict.ai || {};

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="text-muted-foreground text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t.noConversations || "No conversations yet"}</p>
          <p className="text-xs mt-1">
            {t.startChatting || "Start a new chat to get started"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={cn(
              "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
              activeId === conversation.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
            onClick={() => onSelect(conversation.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">
                {conversation.title || t.untitled || "Untitled"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDistanceToNow(new Date(conversation.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t.deleteConversation?.title || dict.deleteConfirmation?.title || "Delete conversation?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteConversation?.description || dict.deleteConfirmation?.description ||
                      "This action cannot be undone."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{dict.common?.buttons?.cancel || dict.cancel || "Cancel"}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conversation.id);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {dict.common?.buttons?.delete || dict.delete || "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
