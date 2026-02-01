"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Plus,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { ConversationList } from "./ConversationList";
import { MessageList } from "./MessageList";
import { AiMentionInput, type MentionedEntity } from "./AiMentionInput";
import { WelcomeScreen } from "@/components/ai/WelcomeScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/dictionaries";
import type { ToolCallResult } from "@/components/ai/ToolResultCard";

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCallResult[];
  mentions?: MentionedEntity[];
}

interface Conversation {
  id: string;
  title: string | null;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface AiChatInterfaceProps {
  locale: string;
  dict: Dictionary;
  initialConversations: Conversation[];
  userName?: string;
}

export function AiChatInterface({
  locale,
  dict,
  initialConversations,
  userName,
}: AiChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mentionedEntities, setMentionedEntities] = useState<MentionedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load conversation messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      const conversation = conversations.find((c) => c.id === activeConversationId);
      if (conversation) {
        setMessages(conversation.messages || []);
        setShowWelcome(false);
      }
    } else {
      setMessages([]);
      setShowWelcome(true);
    }
  }, [activeConversationId, conversations]);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setMentionedEntities([]);
    setShowWelcome(true);
    inputRef.current?.focus();
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));
      
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setShowWelcome(true);
      }

      toast.success(dict.ai?.conversationDeleted || "Conversation deleted");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(dict.ai?.deleteError || "Failed to delete conversation");
    }
  }, [activeConversationId, dict]);

  const handleQuickAction = useCallback((action: string) => {
    setInput(action);
    setShowWelcome(false);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input.trim(),
      mentions: mentionedEntities.length > 0 ? mentionedEntities : undefined,
    };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setMentionedEntities([]);
    setIsLoading(true);
    setShowWelcome(false);

    try {
      // Send message to AI API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          useTools: true,
          mentions: mentionedEntities.length > 0 ? mentionedEntities : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      if (data.success && data.message) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message.content,
          toolCalls: data.toolCalls,
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);

        // Save or update conversation
        await saveConversation(updatedMessages, userMessage.content);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(dict.ai?.sendError || "Failed to send message");
      
      // Remove the user message on error by reverting to previous state
      setMessages((prevMessages) => prevMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (msgs: Message[], firstMessage: string) => {
    try {
      if (activeConversationId) {
        // Update existing conversation
        const response = await fetch(`/api/ai/conversations/${activeConversationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs }),
        });

        if (response.ok) {
          const updated = await response.json();
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? updated : c))
          );
        }
      } else {
        // Create new conversation
        const response = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
            messages: msgs,
          }),
        });

        if (response.ok) {
          const newConversation = await response.json();
          setConversations((prev) => [newConversation, ...prev]);
          setActiveConversationId(newConversation.id);
        }
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  const t = dict.ai || {};

  return (
    <div className="flex h-[calc(100vh-180px)] gap-0">
      {/* Conversation Sidebar */}
      <div
        className={cn(
          "shrink-0 flex flex-col border-r bg-muted/30 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-72"
        )}
      >
        <div className="p-3 border-b bg-background/50 backdrop-blur-sm">
          <Button
            onClick={handleNewConversation}
            className="w-full"
            variant="default"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {t.newChat || "New Chat"}
          </Button>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          dict={dict}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-3 left-3 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm border shadow-sm"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto w-full">
            {showWelcome && messages.length === 0 ? (
              <WelcomeScreen
                onSelectAction={handleQuickAction}
                dict={dict}
                userName={userName}
              />
            ) : (
              <div className="p-4 pt-14">
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  dict={dict}
                  locale={locale}
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto w-full p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <AiMentionInput
                value={input}
                onChange={setInput}
                onMentionsChange={setMentionedEntities}
                onSubmit={() => handleSubmit()}
                placeholder={t.inputPlaceholder || "Type @ to mention entities or a message..."}
                disabled={isLoading}
                className="flex-1"
                dict={dict}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t.disclaimer || "AI can make mistakes. Verify important information."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
