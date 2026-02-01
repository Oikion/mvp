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
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
import axios from "axios";

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

interface VoiceCommandButtonProps {
  /** Callback when property data is successfully parsed */
  readonly onPropertyParsed: (data: ParsedPropertyData) => void;
  /** Optional class name */
  readonly className?: string;
  /** Button variant */
  readonly variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  readonly size?: "default" | "sm" | "lg" | "icon";
  /** Whether the button is disabled */
  readonly disabled?: boolean;
}

const EXAMPLE_COMMANDS = [
  "Πρόσθεσε νέο διαμέρισμα στον Γέρακα, Ηροδότου 20. Έχει 2 υπνοδωμάτια, 2 μπάνια, τζάκι και συναγερμό. Προς πώληση στις 250.000 ευρώ.",
  "Νέα μονοκατοικία στην Κηφισιά, 180 τετραγωνικά, 4 υπνοδωμάτια, κήπος και πισίνα. Τιμή 800.000.",
  "Επαγγελματικός χώρος στο Μαρούσι, 120 τ.μ., ισόγειο. Ενοικίαση 1.500 το μήνα.",
];

export function VoiceCommandButton({
  onPropertyParsed,
  className,
  variant = "outline",
  size = "default",
  disabled = false,
}: VoiceCommandButtonProps) {
  const { toast } = useAppToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPropertyData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

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
    if (state === "idle" && transcript.trim() && !isParsing && !parsedData) {
      handleParse(transcript);
    }
  }, [state, transcript, isParsing, parsedData, handleParse]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopListening();
    reset();
    setParsedData(null);
    setParseError(null);
    setIsDialogOpen(false);
  }, [stopListening, reset]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (parsedData) {
      onPropertyParsed(parsedData);
      toast.success("Επιτυχία", {
        description: "Τα δεδομένα μεταφέρθηκαν στη φόρμα",
        isTranslationKey: false,
      });
      handleClose();
    }
  }, [parsedData, onPropertyParsed, toast, handleClose]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setParsedData(null);
    setParseError(null);
    reset();
  }, [reset]);

  // Show unsupported message
  if (!isSupported) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        title="Η αναγνώριση ομιλίας δεν υποστηρίζεται"
        leftIcon={<MicOff className="h-4 w-4" />}
      >
        Μη διαθέσιμο
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        title="Φωνητική εντολή"
      >
        <Mic className="h-4 w-4 mr-2" />
        Φωνητική εντολή
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Φωνητική Εντολή
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
                    ? "bg-destructive text-destructive-foreground animate-pulse"
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
              <p className="text-sm text-muted-foreground">
                {state === "listening" 
                  ? "Ακούω... Πατήστε για να σταματήσετε"
                  : isParsing
                  ? "Ανάλυση..."
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
              <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Αναγνωρισμένα δεδομένα
                  </p>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Ακρίβεια: {Math.round((parsedData.confidence || 0) * 100)}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {parsedData.property_name && (
                    <div><span className="font-medium">Όνομα:</span> {parsedData.property_name}</div>
                  )}
                  {parsedData.property_type && (
                    <div><span className="font-medium">Τύπος:</span> {translatePropertyType(parsedData.property_type)}</div>
                  )}
                  {parsedData.transaction_type && (
                    <div><span className="font-medium">Συναλλαγή:</span> {translateTransactionType(parsedData.transaction_type)}</div>
                  )}
                  {parsedData.municipality && (
                    <div><span className="font-medium">Δήμος:</span> {parsedData.municipality}</div>
                  )}
                  {parsedData.area && (
                    <div><span className="font-medium">Περιοχή:</span> {parsedData.area}</div>
                  )}
                  {parsedData.address_street && (
                    <div><span className="font-medium">Διεύθυνση:</span> {parsedData.address_street}</div>
                  )}
                  {parsedData.postal_code && (
                    <div><span className="font-medium">Τ.Κ.:</span> {parsedData.postal_code}</div>
                  )}
                  {parsedData.price && (
                    <div><span className="font-medium">Τιμή:</span> {parsedData.price.toLocaleString("el-GR")} €</div>
                  )}
                  {parsedData.bedrooms !== undefined && (
                    <div><span className="font-medium">Υ/Δ:</span> {parsedData.bedrooms}</div>
                  )}
                  {parsedData.bathrooms !== undefined && (
                    <div><span className="font-medium">Μπάνια:</span> {parsedData.bathrooms}</div>
                  )}
                  {parsedData.size_net_sqm && (
                    <div><span className="font-medium">Εμβαδόν:</span> {parsedData.size_net_sqm} τ.μ.</div>
                  )}
                  {parsedData.furnished && (
                    <div><span className="font-medium">Επίπλωση:</span> {translateFurnished(parsedData.furnished)}</div>
                  )}
                  {parsedData.amenities && parsedData.amenities.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Παροχές:</span>{" "}
                      {parsedData.amenities.map(translateAmenity).join(", ")}
                    </div>
                  )}
                </div>

                {parsedData.missing_required && parsedData.missing_required.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
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
                    <li key={i} className="italic">"{cmd}"</li>
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
                  Χρήση δεδομένων
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

// Translation helpers
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
