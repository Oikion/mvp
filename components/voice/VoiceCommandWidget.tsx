"use client";

import { useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, X, Check, AlertCircle } from "lucide-react";
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
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";

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
  plot_size_sqm?: number;
  year_built?: number;
  heating_type?: string;
  furnished?: string;
  condition?: string;
  elevator?: boolean;
  amenities?: string[];
  description?: string;
  confidence: number;
  missing_required: string[];
}

// ============================================
// Animated Gradient Header Component
// ============================================

function VoiceActiveHeader({ isVisible }: { readonly isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden"
      role="status"
      aria-label="Voice mode active"
    >
      <div 
        className="absolute inset-0 animate-gradient-x"
        style={{
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f97316, #3b82f6)",
          backgroundSize: "200% 100%",
        }}
      />
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-sm animate-gradient-x opacity-60"
        style={{
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f97316, #3b82f6)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}

// ============================================
// Example Commands
// ============================================

const EXAMPLE_COMMANDS = [
  "Πρόσθεσε διαμέρισμα στο Γέρακα, 2 υπνοδωμάτια, τζάκι, 250.000 ευρώ",
  "Νέα μονοκατοικία στην Κηφισιά, 180 τ.μ., κήπος, 800.000",
  "Επαγγελματικός χώρος στο Μαρούσι, ενοικίαση 1.500",
];

// ============================================
// Translation Helpers
// ============================================

function translatePropertyType(type: string): string {
  const translations: Record<string, string> = {
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
  return translations[type] || type;
}

function translateTransactionType(type: string): string {
  const translations: Record<string, string> = {
    SALE: "Πώληση",
    RENTAL: "Ενοικίαση",
    SHORT_TERM: "Βραχυχρόνια",
    EXCHANGE: "Αντιπαροχή",
  };
  return translations[type] || type;
}

function translateFurnished(status: string): string {
  const translations: Record<string, string> = {
    NO: "Χωρίς έπιπλα",
    PARTIALLY: "Μερικώς",
    FULLY: "Πλήρως",
  };
  return translations[status] || status;
}

function translateAmenity(amenity: string): string {
  const translations: Record<string, string> = {
    AC: "Κλιματισμός",
    FIREPLACE: "Τζάκι",
    PARKING: "Parking",
    STORAGE: "Αποθήκη",
    SOLAR: "Ηλιακός",
    DOUBLE_GLAZING: "Διπλά τζάμια",
    VIEW: "Θέα",
    BALCONY: "Μπαλκόνι",
    GARDEN: "Κήπος",
    PET_FRIENDLY: "Pet-friendly",
    FRONTAGE: "Πρόσοψη",
    ALARM: "Συναγερμός",
    SECURITY_DOOR: "Πόρτα ασφαλείας",
    ELEVATOR: "Ανελκυστήρας",
    POOL: "Πισίνα",
    GYM: "Γυμναστήριο",
    ATTIC: "Σοφίτα",
    BASEMENT: "Υπόγειο",
  };
  return translations[amenity] || amenity;
}

// ============================================
// Main Component
// ============================================

export function VoiceCommandWidget() {
  const { toast } = useAppToast();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPropertyData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);

  const {
    state,
    transcript,
    isSupported,
    startListening,
    stopListening,
    reset,
    error: voiceError,
  } = useVoiceInput({
    language: "el-GR",
    continuous: true,
    interimResults: true,
  });

  // Determine if we're on a page where voice commands are relevant
  const isRelevantPage = pathname?.includes("/mls") || pathname?.includes("/crm");

  // Check if any modal/dialog is open (to hide the floating button)
  useEffect(() => {
    const checkDialogState = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]');
      const hasOpenSheet = document.querySelector('[data-state="open"].fixed');
      setIsHidden(!!hasOpenDialog || !!hasOpenSheet);
    };

    // Initial check
    checkDialogState();

    // Monitor DOM for changes
    const observer = new MutationObserver(checkDialogState);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['data-state'] 
    });

    return () => observer.disconnect();
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + Shift + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (!isDialogOpen) {
          setIsDialogOpen(true);
        }
      }
      // Escape to close when in dialog
      if (e.key === "Escape" && isDialogOpen && state !== "listening") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, state]);

  // Handle parse submission
  const handleParse = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsParsing(true);
    setParsedData(null);
    setParseError(null);

    try {
      const response = await axios.post("/api/voice/parse-property", {
        transcript: text,
      });

      if (response.data.success) {
        setParsedData(response.data.data);
      } else {
        setParseError(response.data.error || "Αποτυχία ανάλυσης");
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || "Αποτυχία επικοινωνίας με τον server";
      setParseError(message);
    } finally {
      setIsParsing(false);
    }
  }, []);

  // When voice stops, parse the transcript
  useEffect(() => {
    if (state === "idle" && transcript.trim() && !isParsing && !parsedData && isDialogOpen) {
      handleParse(transcript);
    }
  }, [state, transcript, isParsing, parsedData, handleParse, isDialogOpen]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopListening();
    reset();
    setParsedData(null);
    setParseError(null);
    setIsDialogOpen(false);
  }, [stopListening, reset]);

  // Handle confirm - navigate to properties page which will auto-open the creation form
  const handleConfirm = useCallback(() => {
    if (parsedData) {
      // Store parsed data in sessionStorage for the property form to pick up
      sessionStorage.setItem("voicePropertyData", JSON.stringify(parsedData));
      
      toast.success("Επιτυχία", {
        description: "Μεταφορά στη φόρμα δημιουργίας...",
        isTranslationKey: false,
      });
      
      handleClose();
      
      // Navigate to properties page - it will auto-open the creation sheet with voice data
      const locale = pathname?.split("/")[1] || "el";
      
      // If already on properties page, dispatch custom event to trigger re-check
      if (pathname?.includes("/mls/properties")) {
        globalThis.window.dispatchEvent(new CustomEvent("voicePropertyDataReady"));
      } else {
        router.push(`/${locale}/app/mls/properties`);
      }
    }
  }, [parsedData, toast, handleClose, router, pathname]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setParsedData(null);
    setParseError(null);
    reset();
  }, [reset]);

  // Don't render if speech recognition is not supported
  if (!isSupported) {
    return null;
  }

  // Only show on relevant pages
  if (!isRelevantPage) {
    return null;
  }

  const isVoiceActive = state === "listening" || isParsing;

  return (
    <>
      {/* Animated gradient header when voice is active */}
      <VoiceActiveHeader isVisible={isVoiceActive || isDialogOpen} />

      {/* Floating Mic Button - positioned above quick add button */}
      {!isHidden && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDialogOpen(true)}
                className={cn(
                  "fixed z-[59] transition-all duration-300",
                  // Position above the quick add button (which is at bottom-6 right-6)
                  "bottom-24 right-6",
                  // Styling
                  "h-12 w-12 rounded-full shadow-lg",
                  "flex items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  // Colors
                  isVoiceActive
                    ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white animate-pulse"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                aria-label="Φωνητική εντολή (⌘+Shift+V)"
              >
                {isVoiceActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="flex items-center gap-2">
              <span>Φωνητική εντολή</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>⇧V
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Voice Command Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[600px]">
          {/* Dialog gradient header */}
          {isVoiceActive && (
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg overflow-hidden"
            >
              <div 
                className="absolute inset-0 animate-gradient-x"
                style={{
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f97316, #3b82f6)",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          )}
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Φωνητική Εντολή
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>⇧V
              </kbd>
            </DialogTitle>
            <DialogDescription>
              Περιγράψτε το ακίνητο που θέλετε να προσθέσετε
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Voice recording area */}
            <div className="flex flex-col items-center gap-4">
              {/* Mic button */}
              <button
                onClick={() => {
                  if (state === "listening") {
                    stopListening();
                  } else {
                    handleRetry();
                    startListening();
                  }
                }}
                disabled={isParsing}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  state === "listening"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  isParsing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isParsing ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : state === "listening" ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
                
                {/* Pulse animation when listening */}
                {state === "listening" && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-20" />
                    <span className="absolute inset-0 rounded-full bg-destructive animate-pulse opacity-30" />
                  </>
                )}
              </button>

              {/* Status text */}
              <p className="text-sm text-muted-foreground text-center">
                {state === "listening" 
                  ? "Ακούω... Πατήστε για να σταματήσετε"
                  : isParsing
                  ? "Ανάλυση με AI..."
                  : "Πατήστε για να ξεκινήσετε"}
              </p>
            </div>

            {/* Transcript display */}
            {transcript && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Αναγνωρισμένο κείμενο:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            {/* Error display */}
            {(voiceError || parseError) && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Σφάλμα</p>
                  <p className="text-sm text-destructive/80">{voiceError || parseError}</p>
                </div>
              </div>
            )}

            {/* Parsed data preview */}
            {parsedData && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-success" />
                  <p className="text-sm font-medium text-success">
                    Αναγνωρισμένα δεδομένα
                  </p>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Ακρίβεια: {Math.round((parsedData.confidence || 0) * 100)}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
                  {parsedData.property_name && (
                    <div><span className="font-medium text-muted-foreground">Όνομα:</span> {parsedData.property_name}</div>
                  )}
                  {parsedData.property_type && (
                    <div><span className="font-medium text-muted-foreground">Τύπος:</span> {translatePropertyType(parsedData.property_type)}</div>
                  )}
                  {parsedData.transaction_type && (
                    <div><span className="font-medium text-muted-foreground">Συναλλαγή:</span> {translateTransactionType(parsedData.transaction_type)}</div>
                  )}
                  {parsedData.municipality && (
                    <div><span className="font-medium text-muted-foreground">Δήμος:</span> {parsedData.municipality}</div>
                  )}
                  {parsedData.area && (
                    <div><span className="font-medium text-muted-foreground">Περιοχή:</span> {parsedData.area}</div>
                  )}
                  {parsedData.address_street && (
                    <div><span className="font-medium text-muted-foreground">Διεύθυνση:</span> {parsedData.address_street}</div>
                  )}
                  {parsedData.postal_code && (
                    <div><span className="font-medium text-muted-foreground">Τ.Κ.:</span> {parsedData.postal_code}</div>
                  )}
                  {parsedData.price && (
                    <div><span className="font-medium text-muted-foreground">Τιμή:</span> {parsedData.price.toLocaleString("el-GR")} €</div>
                  )}
                  {parsedData.bedrooms !== undefined && (
                    <div><span className="font-medium text-muted-foreground">Υ/Δ:</span> {parsedData.bedrooms}</div>
                  )}
                  {parsedData.bathrooms !== undefined && (
                    <div><span className="font-medium text-muted-foreground">Μπάνια:</span> {parsedData.bathrooms}</div>
                  )}
                  {parsedData.size_net_sqm && (
                    <div><span className="font-medium text-muted-foreground">Εμβαδόν:</span> {parsedData.size_net_sqm} τ.μ.</div>
                  )}
                  {parsedData.furnished && (
                    <div><span className="font-medium text-muted-foreground">Επίπλωση:</span> {translateFurnished(parsedData.furnished)}</div>
                  )}
                  {parsedData.amenities && parsedData.amenities.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">Παροχές:</span>{" "}
                      {parsedData.amenities.map(translateAmenity).join(", ")}
                    </div>
                  )}
                </div>

                {parsedData.missing_required && parsedData.missing_required.length > 0 && (
                  <p className="text-xs text-warning mt-2">
                    Δεν αναγνωρίστηκαν: {parsedData.missing_required.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Example commands */}
            {!transcript && !parsedData && state !== "listening" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Παραδείγματα εντολών:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {EXAMPLE_COMMANDS.map((cmd, i) => (
                    <li key={`example-${i}`} className="italic">"{cmd}"</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              leftIcon={<X className="h-4 w-4" />}
            >
              Ακύρωση
            </Button>
            {parsedData ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRetry} 
                  leftIcon={<Mic className="h-4 w-4" />}
                >
                  Νέα εγγραφή
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Δημιουργία ακινήτου
                </Button>
              </>
            ) : transcript && !isParsing ? (
              <Button onClick={() => handleParse(transcript)}>
                <Loader2 className="h-4 w-4 mr-2" />
                Ανάλυση
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
