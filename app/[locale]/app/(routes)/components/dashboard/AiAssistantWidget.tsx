"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  Send,
  Loader2,
  User,
  Sparkles,
  Maximize2,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantWidgetProps {
  userName?: string | null;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  userName,
}) => {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          useTools: false, // Simple chat mode for widget
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const assistantMessage = data.content || data.text || t("aiErrorResponse");
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("aiErrorResponse") },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    t("aiQuickPrompt1"),
    t("aiQuickPrompt2"),
    t("aiQuickPrompt3"),
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("aiAssistant")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/ai`} className="flex items-center gap-1">
            <Maximize2 className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              {t("aiWelcome", { name: userName?.split(" ")[0] || "" })}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {t("aiWelcomeHint")}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 px-2"
                  onClick={() => handleQuickPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={`${message.role}-${idx}-${message.content.slice(0, 20)}`}
                  className={`flex gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 text-xs max-w-[85%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {userName?.charAt(0) || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="h-3 w-3 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-3 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mt-3 shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aiInputPlaceholder")}
            className="h-9 text-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
