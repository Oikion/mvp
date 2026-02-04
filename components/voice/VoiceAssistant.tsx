"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Mic,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  Settings2,
  Building2,
  ArrowLeftRight,
  MapPin,
  Euro,
  Bed,
  Bath,
  Ruler,
  Layers,
  Calendar,
  Flame,
  Sparkles,
  ListChecks,
  Play,
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
import { usePathname, useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ============================================
// Types
// ============================================

interface ParsedPropertyData {
  property_name?: string;
  property_type?: string;
  transaction_type?: string;
  municipality?: string;
  area?: string;
  address_street?: string;
  postal_code?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  size_net_sqm?: number;
  size_gross_sqm?: number;
  floor?: string;
  floors_total?: number;
  year_built?: number;
  heating_type?: string;
  furnished?: string;
  condition?: string;
  elevator?: boolean;
  amenities?: string[];
  description?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  extractedData?: Partial<ParsedPropertyData>; // Data extracted in this turn
}

interface ConversationState {
  phase: "initial" | "gathering" | "followup" | "confirm" | "complete";
  collectedData: ParsedPropertyData;
  missingRequired: string[];
  conversationHistory: Array<{ role: string; content: string }>;
}

// Privacy level for auto-listen behavior
type PrivacyLevel = "ask_always" | "ask_important" | "never_ask";

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  ask_always: "Χειροκίνητη λειτουργία",
  ask_important: "Ημι-αυτόματη",
  never_ask: "Πλήρως αυτόματη",
};

const PRIVACY_DESCRIPTIONS: Record<PrivacyLevel, string> = {
  ask_always: "Πατήστε κάθε φορά για να μιλήσετε",
  ask_important: "Ανιχνεύει αυτόματα παύσεις (εκτός επιβεβαιώσεων)",
  never_ask: "Ανιχνεύει παύσεις - hands-free συνομιλία",
};

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
  { id: "fable", label: "Fable", description: "Αφηγηματική" },
  { id: "onyx", label: "Onyx", description: "Βαθιά, ανδρική" },
  { id: "shimmer", label: "Shimmer", description: "Απαλή, γυναικεία" },
];

// Field icons mapping
const FIELD_ICONS: Record<string, React.ElementType> = {
  property_type: Building2,
  transaction_type: ArrowLeftRight,
  municipality: MapPin,
  area: MapPin,
  price: Euro,
  bedrooms: Bed,
  bathrooms: Bath,
  size_net_sqm: Ruler,
  size_gross_sqm: Ruler,
  floor: Layers,
  year_built: Calendar,
  heating_type: Flame,
  condition: Sparkles,
  amenities: ListChecks,
};

// LocalStorage keys
const LS_PRIVACY_KEY = "oikion-voice-privacy";
const LS_VOICE_KEY = "oikion-voice-selected";

// ============================================
// Translation Helpers
// ============================================

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Διαμέρισμα",
  HOUSE: "Μονοκατοικία",
  MAISONETTE: "Μεζονέτα",
  COMMERCIAL: "Επαγγελματικό",
  WAREHOUSE: "Αποθήκη",
  PARKING: "Parking",
  PLOT: "Οικόπεδο",
  FARM: "Αγροτεμάχιο",
  INDUSTRIAL: "Βιομηχανικό",
  OTHER: "Άλλο",
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  SALE: "Πώληση",
  RENTAL: "Ενοικίαση",
  SHORT_TERM: "Βραχυχρόνια",
  EXCHANGE: "Αντιπαροχή",
};

const FIELD_LABELS: Record<string, string> = {
  property_type: "Τύπος",
  transaction_type: "Συναλλαγή",
  municipality: "Δήμος",
  area: "Περιοχή",
  price: "Τιμή",
  bedrooms: "Υ/Δ",
  bathrooms: "Μπάνια",
  size_net_sqm: "Εμβαδόν",
  floor: "Όροφος",
  year_built: "Έτος",
  heating_type: "Θέρμανση",
  condition: "Κατάσταση",
  furnished: "Επίπλωση",
  amenities: "Παροχές",
};

function formatFieldValue(field: string, value: any): string {
  if (value === undefined || value === null) return "-";

  switch (field) {
    case "property_type":
      return PROPERTY_TYPE_LABELS[value] || value;
    case "transaction_type":
      return TRANSACTION_TYPE_LABELS[value] || value;
    case "price":
      return `${Number(value).toLocaleString("el-GR")} €`;
    case "size_net_sqm":
    case "size_gross_sqm":
    case "plot_size_sqm":
      return `${value} τ.μ.`;
    case "amenities":
      return Array.isArray(value) ? value.length.toString() : "-";
    default:
      return String(value);
  }
}

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
// Animated Gradient Header Component
// ============================================

function VoiceActiveHeader({ isVisible }: { readonly isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <output
      className="fixed top-0 left-0 right-0 h-1.5 z-[100] overflow-hidden block"
      aria-label="Oikion AI active"
    >
      <div
        className="absolute inset-0 animate-gradient-x"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7), hsl(265 70% 60%), hsl(var(--primary) / 0.7), hsl(var(--primary)))",
          backgroundSize: "200% 100%",
        }}
      />
      <div
        className="absolute inset-0 blur-sm animate-gradient-x opacity-60"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7), hsl(265 70% 60%), hsl(var(--primary) / 0.7), hsl(var(--primary)))",
          backgroundSize: "200% 100%",
        }}
      />
    </output>
  );
}

// ============================================
// Message Bubble Component
// ============================================

function MessageBubble({
  message,
  isUser,
}: {
  readonly message: ConversationMessage;
  readonly isUser: boolean;
}) {
  const hasExtractedData = !isUser && message.extractedData && 
    Object.keys(message.extractedData).length > 0;

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <OikionLogo className="text-primary" size={18} />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser ? "flex justify-end" : "")}>
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
        
        {/* Show extracted data card for assistant messages */}
        {hasExtractedData && (
          <ExtractedDataCard data={message.extractedData!} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Collected Data Display
// ============================================

function CollectedDataDisplay({
  data,
  missingRequired,
}: {
  readonly data: ParsedPropertyData;
  readonly missingRequired: string[];
}) {
  const fields = Object.entries(data).filter(
    ([key, value]) => value !== undefined && value !== null && key !== "amenities"
  );

  const totalFields = 14; // Approximate total important fields
  const filledFields = fields.length;
  const progress = Math.round((filledFields / totalFields) * 100);

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Πρόοδος συμπλήρωσης
        </span>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />

      {fields.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {fields.map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="text-xs font-normal"
            >
              {FIELD_LABELS[key] || key}: {formatFieldValue(key, value)}
            </Badge>
          ))}
          {data.amenities && data.amenities.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              Παροχές: {data.amenities.length}
            </Badge>
          )}
        </div>
      )}

      {missingRequired.length > 0 && (
        <p className="text-xs text-warning">
          Λείπουν: {missingRequired.map((f) => FIELD_LABELS[f] || f).join(", ")}
        </p>
      )}
    </div>
  );
}

// ============================================
// Extracted Data Card - Shows newly extracted fields in chat
// ============================================

function ExtractedDataCard({ data }: { readonly data: Partial<ParsedPropertyData> }) {
  const fields = Object.entries(data).filter(
    ([key, value]) => 
      value !== undefined && 
      value !== null && 
      key !== "amenities" &&
      key !== "description"
  );

  if (fields.length === 0 && (!data.amenities || data.amenities.length === 0)) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Αναγνώρισα</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([key, value]) => {
          const Icon = FIELD_ICONS[key] || Sparkles;
          return (
            <div
              key={key}
              className="flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-border/50"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground truncate">
                  {FIELD_LABELS[key] || key}
                </p>
                <p className="text-xs font-medium truncate">
                  {formatFieldValue(key, value)}
                </p>
              </div>
            </div>
          );
        })}
        
        {data.amenities && data.amenities.length > 0 && (
          <div className="col-span-2 flex items-center gap-2 p-2 bg-background/60 rounded-lg border border-border/50">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">Παροχές</p>
              <p className="text-xs font-medium">{data.amenities.length} παροχές</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Settings Popover Component
// ============================================

function SettingsPopover({
  privacyLevel,
  onPrivacyChange,
  selectedVoice,
  onVoiceChange,
  onPreviewVoice,
  isPreviewLoading,
}: {
  readonly privacyLevel: PrivacyLevel;
  readonly onPrivacyChange: (level: PrivacyLevel) => void;
  readonly selectedVoice: TTSVoice;
  readonly onVoiceChange: (voice: TTSVoice) => void;
  readonly onPreviewVoice: (voice: TTSVoice) => void;
  readonly isPreviewLoading: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ρυθμίσεις">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          {/* Privacy Level Section */}
          <div>
            <h4 className="text-sm font-medium mb-2">Λειτουργία συνομιλίας</h4>
            <div className="space-y-1">
              {(Object.keys(PRIVACY_LABELS) as PrivacyLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onPrivacyChange(level)}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                    privacyLevel === level
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      privacyLevel === level
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {privacyLevel === level && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{PRIVACY_LABELS[level]}</p>
                    <p className="text-xs text-muted-foreground">
                      {PRIVACY_DESCRIPTIONS[level]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            {/* Voice Selection Section */}
            <h4 className="text-sm font-medium mb-2">Φωνή βοηθού</h4>
            <div className="space-y-1">
              {VOICE_OPTIONS.map((voice) => (
                <div
                  key={voice.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg transition-colors",
                    selectedVoice === voice.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted"
                  )}
                >
                  <button
                    onClick={() => onVoiceChange(voice.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        selectedVoice === voice.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {selectedVoice === voice.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{voice.label}</p>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onPreviewVoice(voice.id)}
                    disabled={isPreviewLoading}
                    title="Ακρόαση δείγματος"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Main Component
// ============================================

export function VoiceAssistant() {
  const { toast } = useAppToast();
  const pathname = usePathname();
  const router = useRouter();

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // Privacy level (loaded from localStorage)
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>("ask_always");
  
  // Selected voice (loaded from localStorage)
  const [selectedVoice, setSelectedVoice] = useState<TTSVoice>("nova");
  
  // Preview loading state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSentTranscriptRef = useRef<string>("");
  const wasSpeakingRef = useRef(false);
  const autoListenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedPrivacy = localStorage.getItem(LS_PRIVACY_KEY) as PrivacyLevel | null;
    if (savedPrivacy && Object.keys(PRIVACY_LABELS).includes(savedPrivacy)) {
      setPrivacyLevel(savedPrivacy);
    }
    
    const savedVoice = localStorage.getItem(LS_VOICE_KEY) as TTSVoice | null;
    if (savedVoice && VOICE_OPTIONS.some(v => v.id === savedVoice)) {
      setSelectedVoice(savedVoice);
    }
  }, []);

  // Save privacy level to localStorage
  const handlePrivacyChange = useCallback((level: PrivacyLevel) => {
    setPrivacyLevel(level);
    localStorage.setItem(LS_PRIVACY_KEY, level);
  }, []);

  // Save voice to localStorage and update TTS
  const handleVoiceChange = useCallback((voice: TTSVoice) => {
    setSelectedVoice(voice);
    localStorage.setItem(LS_VOICE_KEY, voice);
  }, []);

  // Determine if VAD should be enabled based on privacy level
  const shouldEnableVAD = privacyLevel === "never_ask" || privacyLevel === "ask_important";

  // Voice input hook with VAD support
  const {
    state: voiceState,
    transcript,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    reset: resetVoice,
    error: voiceError,
    isSpeaking: isUserSpeaking,
  } = useVoiceInput({
    language: "el-GR",
    continuous: true,
    interimResults: true,
    enableVAD: shouldEnableVAD,
    silenceTimeoutMs: 1200, // 1.2 seconds max silence (smart detection uses less for complete sentences)
    minSpeechDurationMs: 250, // Wait at least 250ms of speech before VAD kicks in
    onSpeechEnd: () => {
      // VAD detected end of speech
      console.debug("VAD: End of speech detected");
    },
  });

  // Text-to-speech hook
  const {
    speak,
    stop: stopSpeaking,
    isPlaying: isSpeaking,
    isLoading: ttsLoading,
    error: ttsError,
    setVoice,
  } = useTextToSpeech({
    voice: selectedVoice,
    speed: 1.1,
  });

  // Update TTS voice when selection changes
  useEffect(() => {
    setVoice(selectedVoice);
  }, [selectedVoice, setVoice]);

  // Preview voice handler
  const handlePreviewVoice = useCallback(async (voice: TTSVoice) => {
    setIsPreviewLoading(true);
    try {
      // Temporarily set voice for preview
      const originalVoice = selectedVoice;
      setVoice(voice);
      await speak("Γεια σας, είμαι ο βοηθός σας.");
      // Restore original voice after preview
      setVoice(originalVoice);
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [selectedVoice, setVoice, speak]);
  
  // Log TTS errors for debugging
  useEffect(() => {
    if (ttsError) {
      console.error("TTS Error:", ttsError);
    }
  }, [ttsError]);

  // Auto-listen after agent finishes speaking (based on privacy level)
  useEffect(() => {
    // Clear any pending timeout
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }

    // Track when speaking stops
    if (wasSpeakingRef.current && !isSpeaking && isOpen && !isProcessing) {
      // Agent just finished speaking - check if we should auto-listen
      const isConfirmPhase = conversationState?.phase === "confirm";
      
      const shouldAutoListen = 
        privacyLevel === "never_ask" ||
        (privacyLevel === "ask_important" && !isConfirmPhase);

      if (shouldAutoListen && voiceState !== "listening") {
        // Small delay for natural conversation flow
        autoListenTimeoutRef.current = setTimeout(() => {
          lastSentTranscriptRef.current = ""; // Reset to allow new recording
          startListening();
        }, 600);
      }
    }

    wasSpeakingRef.current = isSpeaking;

    return () => {
      if (autoListenTimeoutRef.current) {
        clearTimeout(autoListenTimeoutRef.current);
      }
    };
  }, [isSpeaking, isOpen, isProcessing, privacyLevel, conversationState?.phase, voiceState, startListening]);

  // Check if on relevant page
  const isRelevantPage = pathname?.includes("/mls") || pathname?.includes("/crm");

  // Hide when other dialogs open
  useEffect(() => {
    const checkDialogState = () => {
      const hasOpenDialog = document.querySelector(
        '[role="dialog"][data-state="open"]:not([data-voice-assistant])'
      );
      setIsHidden(!!hasOpenDialog);
    };

    checkDialogState();
    const observer = new MutationObserver(checkDialogState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => observer.disconnect();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Shift + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!isOpen) {
          handleOpen();
        }
      }
    };

    globalThis.window.addEventListener("keydown", handleKeyDown);
    return () => globalThis.window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Start conversation
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setMessages([]);
    setConversationState(null);

    try {
      const response = await fetch("/api/voice/conversation");
      const data = await response.json();

      if (data.success) {
        setConversationState(data.conversationState);
        const greeting: ConversationMessage = {
          role: "assistant",
          content: data.spokenResponse,
          timestamp: new Date(),
        };
        setMessages([greeting]);

        // Speak the greeting if voice enabled
        if (voiceEnabled) {
          try {
            await speak(data.spokenResponse);
          } catch (error_) {
            console.error("Failed to speak greeting:", error_);
          }
        }
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Σφάλμα", {
        description: "Αποτυχία εκκίνησης συνομιλίας",
        isTranslationKey: false,
      });
    }
  }, [voiceEnabled, speak, toast]);

  // Handle user message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      const userMessage: ConversationMessage = {
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      resetVoice();
      setIsProcessing(true);

      try {
        const response = await fetch("/api/voice/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: text.trim(),
            conversationState,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", response.status, errorText);
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setConversationState(data.conversationState);

          const assistantMessage: ConversationMessage = {
            role: "assistant",
            content: data.spokenResponse,
            timestamp: new Date(),
            extractedData: data.extractedData, // Include extracted data for visual display
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Speak the response if voice enabled
          if (voiceEnabled && data.spokenResponse) {
            try {
              await speak(data.spokenResponse);
            } catch (error_) {
              console.error("Failed to speak response:", error_);
            }
          }

          // If conversation is complete, show confirm option
          if (data.isComplete) {
            // Will show confirm button
          }
        } else {
          console.error("Conversation API error:", data.error);
          throw new Error(data.error || "Unknown error");
        }
      } catch (error: any) {
        console.error("Conversation error:", error);
        const errorMessage: ConversationMessage = {
          role: "assistant",
          content: `Συγγνώμη, κάτι πήγε στραβά: ${error.message || "Άγνωστο σφάλμα"}. Μπορείτε να επαναλάβετε;`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    },
    [conversationState, isProcessing, voiceEnabled, speak, resetVoice]
  );

  // Handle voice recording stop - send transcript when recording stops
  useEffect(() => {
    const trimmedTranscript = transcript.trim();
    
    // Only send if:
    // 1. Voice is idle (stopped recording)
    // 2. There's a transcript
    // 3. Not already processing
    // 4. This transcript hasn't been sent yet (prevent duplicates)
    if (
      voiceState === "idle" && 
      trimmedTranscript && 
      !isProcessing && 
      trimmedTranscript !== lastSentTranscriptRef.current
    ) {
      lastSentTranscriptRef.current = trimmedTranscript;
      handleSendMessage(trimmedTranscript);
    }
  }, [voiceState, transcript, isProcessing, handleSendMessage]);

  // Handle close
  const handleClose = useCallback(() => {
    // Clear any pending auto-listen timeout
    if (autoListenTimeoutRef.current) {
      clearTimeout(autoListenTimeoutRef.current);
      autoListenTimeoutRef.current = null;
    }
    stopListening();
    stopSpeaking();
    resetVoice();
    setIsOpen(false);
    setMessages([]);
    setConversationState(null);
    lastSentTranscriptRef.current = ""; // Reset for next session
    wasSpeakingRef.current = false;
  }, [stopListening, stopSpeaking, resetVoice]);

  // Handle confirm and create property
  const handleConfirm = useCallback(() => {
    if (conversationState?.collectedData) {
      sessionStorage.setItem(
        "voicePropertyData",
        JSON.stringify(conversationState.collectedData)
      );

      toast.success("Επιτυχία", {
        description: "Μεταφορά στη φόρμα δημιουργίας...",
        isTranslationKey: false,
      });

      handleClose();

      const locale = pathname?.split("/")[1] || "el";
      if (pathname?.includes("/mls/properties")) {
        globalThis.window.dispatchEvent(new CustomEvent("voicePropertyDataReady"));
      } else {
        router.push(`/${locale}/app/mls/properties`);
      }
    }
  }, [conversationState, toast, handleClose, pathname, router]);

  // Handle restart
  const handleRestart = useCallback(() => {
    setMessages([]);
    setConversationState(null);
    handleOpen();
  }, [handleOpen]);

  // Don't render if not supported or not on relevant page
  if (!voiceSupported || !isRelevantPage) {
    return null;
  }

  const isVoiceActive = voiceState === "listening" || isProcessing || isSpeaking;
  const canComplete =
    conversationState?.missingRequired?.length === 0 &&
    Object.keys(conversationState?.collectedData || {}).length > 0;

  return (
    <>
      {/* Animated gradient header */}
      <VoiceActiveHeader isVisible={isOpen && isVoiceActive} />

      {/* Floating button - Oikion branded */}
      {!isHidden && !isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpen}
                className={cn(
                  "fixed z-[59] transition-all duration-300",
                  "bottom-24 right-6",
                  "h-12 w-12 rounded-full shadow-lg",
                  "flex items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  "bg-primary text-primary-foreground",
                  "hover:shadow-xl hover:scale-105",
                  "group"
                )}
                aria-label="Oikion AI (⌘+Shift+V)"
              >
                <OikionLogo size={24} className="transition-transform group-hover:scale-110" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="flex items-center gap-2">
              <span>Oikion AI</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>⇧V
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Oikion AI Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0"
          data-voice-assistant="true"
        >
          {/* Gradient header when active */}
          {isVoiceActive && (
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg overflow-hidden">
              <div
                className="absolute inset-0 animate-gradient-x"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7), hsl(265 70% 60%), hsl(var(--primary) / 0.7), hsl(var(--primary)))",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          )}

          {/* Header */}
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <OikionLogo size={24} className="text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-base flex items-center gap-2">
                    <span>Oikion AI</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">Beta</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Περιγράψτε το ακίνητο με τη φωνή σας
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  title={voiceEnabled ? "Απενεργοποίηση φωνής" : "Ενεργοποίηση φωνής"}
                >
                  {voiceEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
                <SettingsPopover
                  privacyLevel={privacyLevel}
                  onPrivacyChange={handlePrivacyChange}
                  selectedVoice={selectedVoice}
                  onVoiceChange={handleVoiceChange}
                  onPreviewVoice={handlePreviewVoice}
                  isPreviewLoading={isPreviewLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRestart}
                  title="Επανεκκίνηση"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Collected data display */}
          {conversationState && Object.keys(conversationState.collectedData).length > 0 && (
            <div className="px-4 py-2 border-b">
              <CollectedDataDisplay
                data={conversationState.collectedData}
                missingRequired={conversationState.missingRequired}
              />
            </div>
          )}

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-1">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={`msg-${msg.timestamp.getTime()}-${index}`}
                  message={msg}
                  isUser={msg.role === "user"}
                />
              ))}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex gap-2 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <OikionLogo className="text-primary" size={18} />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Σκέφτομαι</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live transcript */}
              {voiceState === "listening" && transcript && (
                <div className="flex justify-end mb-3">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2 bg-primary/20 border border-primary/30">
                    <p className="text-sm text-muted-foreground italic">{transcript}...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Voice/TTS error */}
          {(voiceError || ttsError) && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              {voiceError && <p className="text-xs text-destructive">Μικρόφωνο: {voiceError}</p>}
              {ttsError && <p className="text-xs text-destructive">Φωνή: {ttsError}</p>}
            </div>
          )}

          {/* Footer with controls */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              {/* Main mic button */}
              <button
                onClick={() => {
                  if (voiceState === "listening") {
                    stopListening();
                  } else {
                    stopSpeaking();
                    lastSentTranscriptRef.current = ""; // Reset so user can re-record
                    startListening();
                  }
                }}
                disabled={isProcessing || ttsLoading}
                className={cn(
                  "relative flex-1 h-12 rounded-full flex items-center justify-center gap-2 transition-all overflow-hidden",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  voiceState === "listening"
                    ? isUserSpeaking 
                      ? "bg-green-600 text-white" // Green when actively speaking
                      : "bg-amber-500 text-white" // Amber when waiting for speech
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  (isProcessing || ttsLoading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Recording pulse effect */}
                {voiceState === "listening" && (
                  <>
                    <span className={cn(
                      "absolute inset-0 rounded-full animate-ping",
                      isUserSpeaking ? "bg-green-600/50" : "bg-amber-500/50"
                    )} />
                    <span className={cn(
                      "absolute inset-0 rounded-full animate-pulse",
                      isUserSpeaking ? "bg-green-600/30" : "bg-amber-500/30"
                    )} />
                  </>
                )}
                
                {voiceState === "listening" && isUserSpeaking && (
                  <>
                    <Mic className="h-5 w-5 relative z-10 animate-pulse" />
                    <span className="font-medium relative z-10">
                      {shouldEnableVAD ? "Σας ακούω..." : "Πατήστε για να σταματήσετε"}
                    </span>
                  </>
                )}
                {voiceState === "listening" && !isUserSpeaking && (
                  <>
                    <Mic className="h-5 w-5 relative z-10" />
                    <span className="font-medium relative z-10">
                      {shouldEnableVAD ? "Περιμένω να μιλήσετε..." : "Πατήστε για να σταματήσετε"}
                    </span>
                  </>
                )}
                {voiceState !== "listening" && isSpeaking && (
                  <>
                    <Volume2 className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">Ο βοηθός μιλάει...</span>
                  </>
                )}
                {voiceState !== "listening" && !isSpeaking && (
                  <>
                    <Mic className="h-5 w-5" />
                    <span className="font-medium">
                      {shouldEnableVAD ? "Πατήστε για να ξεκινήσετε" : "Πατήστε για να μιλήσετε"}
                    </span>
                  </>
                )}
              </button>

              {/* Confirm button when complete */}
              {canComplete && (
                <Button 
                  onClick={handleConfirm} 
                  className="h-12 px-6" 
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Ολοκλήρωση
                </Button>
              )}
            </div>

            {/* Status hint based on mode */}
            <p className="text-xs text-muted-foreground text-center mt-2">
              {shouldEnableVAD ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Αυτόματη ανίχνευση παύσης ενεργή
                  </span>
                  {" · "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">⌘⇧V</kbd>
                </>
              ) : (
                <>
                  Πατήστε{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">⌘⇧V</kbd>{" "}
                  για γρήγορη πρόσβαση
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
