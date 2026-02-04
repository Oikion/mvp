// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Settings2,
  Sparkles,
  Users,
  Building2,
  Calendar,
  Link2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useTextToSpeech, type TTSVoice } from "@/hooks/use-text-to-speech";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================
// Types
// ============================================

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallResult[];
}

interface ToolCallResult {
  name: string;
  displayName: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface VoiceCommandMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
}

// Voice options for TTS
interface VoiceOption {
  id: TTSVoice;
  label: string;
  description: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "nova", label: "Nova", description: "Φιλική, ζεστή" },
  { id: "alloy", label: "Alloy", description: "Ουδέτερη, επαγγελματική" },
  { id: "echo", label: "Echo", description: "Ανδρική, ήρεμη" },
  { id: "shimmer", label: "Shimmer", description: "Απαλή, γυναικεία" },
];

// Tool category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  crm: Users,
  mls: Building2,
  calendar: Calendar,
  system: Link2,
};

// Example commands
const EXAMPLE_COMMANDS = {
  el: [
    { text: "Δημιούργησε πελάτη Μαρία Παπαδοπούλου", category: "crm" },
    { text: "Τι ραντεβού έχω σήμερα;", category: "calendar" },
    { text: "Βρες διαμερίσματα στη Γλυφάδα", category: "mls" },
    { text: "Θύμισέ μου να καλέσω τον κύριο Γεωργίου αύριο", category: "calendar" },
    { text: "Σύνδεσε τον πελάτη με το ακίνητο", category: "system" },
  ],
  en: [
    { text: "Create client Maria Papadopoulou", category: "crm" },
    { text: "What appointments do I have today?", category: "calendar" },
    { text: "Find apartments in Glyfada", category: "mls" },
    { text: "Remind me to call Mr. Georgiou tomorrow", category: "calendar" },
    { text: "Link the client to the property", category: "system" },
  ],
};

// LocalStorage keys
const LS_VOICE_KEY = "oikion-voice-command-voice";

// ============================================
// Oikion Logo Component
// ============================================

function OikionLogo({ className, size = 24 }: { readonly className?: string; readonly size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 185 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M92.5 2.5C105.095 2.5 117.926 5.13147 130.066 10.624L131.239 11.165L131.246 11.168L131.254 11.1719C176.133 32.5918 194.988 86.3843 173.833 131.243L173.829 131.251L173.825 131.26C158.272 163.641 125.893 182.5 92.252 182.5C79.4955 182.5 66.2428 179.694 53.7607 173.835L53.7539 173.832L53.7461 173.828C8.86717 152.408 -9.9877 98.6157 11.167 53.7568L11.1709 53.749L11.1748 53.7402C26.7248 21.3656 58.8512 2.5 92.5 2.5ZM93.4561 12.9531C59.9129 12.7309 31.2878 47.2246 30.8008 91.7842C30.3138 136.361 58.0017 171.578 91.791 172.047C125.314 172.516 153.96 137.802 154.447 93.2158C154.934 48.6459 127.003 13.4223 93.4561 12.9531Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  );
}

// ============================================
// Message Bubble Component
// ============================================

function MessageBubble({
  message,
  isUser,
}: {
  readonly message: VoiceMessage;
  readonly isUser: boolean;
}) {
  const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0;

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <OikionLogo className="text-primary" size={18} />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser ? "flex flex-col items-end" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          <p className="text-sm">{message.content}</p>
        </div>

        {/* Show tool call results */}
        {hasToolCalls && (
          <div className="mt-2 space-y-1.5">
            {message.toolCalls!.map((tool) => (
              <div
                key={`${tool.name}-${tool.success}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                  tool.success
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                {tool.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                <span>{tool.displayName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

interface VoiceCommandAssistantProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly language?: "el" | "en";
}

export function VoiceCommandAssistant({
  open,
  onClose,
  language = "el",
}: VoiceCommandAssistantProps) {
  useAppToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<VoiceCommandMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice>("nova");
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Hooks
  const { isListening, transcript, startListening, stopListening, isSupported } =
    useVoiceInput({
      language: language === "el" ? "el-GR" : "en-US",
      continuous: false,
    });

  const { speak, stop: stopSpeaking } = useTextToSpeech();

  // Load saved voice preference
  useEffect(() => {
    const savedVoice = localStorage.getItem(LS_VOICE_KEY);
    if (savedVoice) {
      setSelectedVoice(savedVoice as TTSVoice);
    }
  }, []);

  // Save voice preference
  const handleVoiceChange = (voice: TTSVoice) => {
    setSelectedVoice(voice);
    localStorage.setItem(LS_VOICE_KEY, voice);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add initial greeting when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting =
        language === "el"
          ? "Γεια σας! Πώς μπορώ να σας βοηθήσω; Μπορείτε να δημιουργήσετε πελάτες, ακίνητα, ραντεβού ή να κάνετε αναζητήσεις."
          : "Hello! How can I help you? You can create clients, properties, appointments, or search for data.";

      setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);

      if (!isMuted) {
        speak(greeting, selectedVoice);
      }
    }
  }, [open, messages.length, language, isMuted, selectedVoice, speak]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      stopSpeaking();
      stopListening();
    }
  }, [open, stopSpeaking, stopListening]);

  // Process voice command
  const processCommand = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Add user message
      const userMessage: VoiceMessage = {
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsProcessing(true);

      try {
        const response = await fetch("/api/voice/commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: text,
            conversationHistory,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process command");
        }

        const data = await response.json();

        // Add assistant message
        const assistantMessage: VoiceMessage = {
          role: "assistant",
          content: data.spokenResponse,
          timestamp: new Date(),
          toolCalls: data.toolCalls || undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation history
        if (data.conversationHistory) {
          setConversationHistory(data.conversationHistory);
        }

        // Speak the response
        if (!isMuted && data.spokenResponse) {
          speak(data.spokenResponse, selectedVoice);
        }
      } catch (error) {
        console.error("Command processing error:", error);
        const errorMessage =
          language === "el"
            ? "Συγγνώμη, υπήρξε ένα σφάλμα. Παρακαλώ δοκιμάστε ξανά."
            : "Sorry, there was an error. Please try again.";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorMessage,
            timestamp: new Date(),
          },
        ]);

        if (!isMuted) {
          speak(errorMessage, selectedVoice);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [conversationHistory, language, isMuted, selectedVoice, speak]
  );

  // Handle transcript updates
  useEffect(() => {
    if (transcript && !isListening) {
      processCommand(transcript);
    }
  }, [transcript, isListening, processCommand]);

  // Toggle listening
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle example command click
  const handleExampleClick = (text: string) => {
    processCommand(text);
  };

  // Clear conversation
  const handleClearConversation = () => {
    setMessages([]);
    setConversationHistory([]);
    stopSpeaking();
  };

  const examples = EXAMPLE_COMMANDS[language];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <OikionLogo className="text-primary" size={20} />
              </div>
              <div>
                <DialogTitle className="text-base">Oikion AI</DialogTitle>
                <DialogDescription className="text-xs">
                  {language === "el"
                    ? "Φωνητικές εντολές"
                    : "Voice Commands"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {(() => {
                      if (isMuted) {
                        return language === "el" ? "Ενεργοποίηση ήχου" : "Unmute";
                      }
                      return language === "el" ? "Σίγαση" : "Mute";
                    })()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">
                      {language === "el" ? "Φωνή" : "Voice"}
                    </h4>
                    <div className="space-y-1">
                      {VOICE_OPTIONS.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => handleVoiceChange(voice.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors",
                            selectedVoice === voice.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                        >
                          <span>{voice.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {voice.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Messages area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-3">
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={`${message.role}-${message.timestamp.getTime()}`}
                message={message}
                isUser={message.role === "user"}
              />
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <OikionLogo className="text-primary" size={18} />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {language === "el" ? "Επεξεργασία..." : "Processing..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Listening indicator */}
            {isListening && (
              <div className="flex gap-2 justify-end">
                <div className="bg-primary/10 rounded-2xl rounded-br-md px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={`wave-${i}`}
                          className="w-1 h-3 bg-primary rounded-full animate-pulse"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {language === "el" ? "Ακούω..." : "Listening..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Example commands when no messages */}
          {messages.length <= 1 && !isProcessing && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                {language === "el" ? "Δοκιμάστε:" : "Try saying:"}
              </p>
              <div className="space-y-2">
                {examples.map((example) => {
                  const Icon = CATEGORY_ICONS[example.category] || Sparkles;
                  return (
                    <button
                      key={example.text}
                      onClick={() => handleExampleClick(example.text)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors group"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{example.text}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Bottom controls */}
        <div className="px-4 py-3 border-t bg-background">
          <div className="flex items-center justify-center gap-3">
            {messages.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearConversation}
                className="text-xs"
              >
                {language === "el" ? "Καθαρισμός" : "Clear"}
              </Button>
            )}

            <Button
              size="lg"
              className={cn(
                "rounded-full h-14 w-14 relative",
                isListening && "bg-red-500 hover:bg-red-600"
              )}
              onClick={handleMicClick}
              disabled={!isSupported || isProcessing}
            >
              <Mic className={cn("h-6 w-6", isListening && "animate-pulse")} />
              {isListening && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
              )}
            </Button>
          </div>

          {!isSupported && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {language === "el"
                ? "Η αναγνώριση φωνής δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης"
                : "Voice recognition is not supported in this browser"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
