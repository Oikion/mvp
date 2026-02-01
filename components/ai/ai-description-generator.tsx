"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";

// Property data interface matching the API
interface PropertyData {
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
  renovated_year?: number;
  heating_type?: string;
  furnished?: string;
  condition?: string;
  elevator?: boolean;
  amenities?: string[];
  orientation?: string[];
  energy_cert_class?: string;
  accepts_pets?: boolean;
  monthly_common_charges?: number;
  virtual_tour_url?: string;
  is_exclusive?: boolean;
}

type DescriptionTone = "professional" | "luxury" | "friendly" | "investment";
type Language = "el" | "en";

interface AIDescriptionGeneratorProps {
  propertyData: PropertyData;
  propertyId?: string;
  onDescriptionGenerated: (description: string) => void;
  currentDescription?: string;
  disabled?: boolean;
  className?: string;
}

const TONE_LABELS: Record<DescriptionTone, { el: string; en: string }> = {
  professional: { el: "Επαγγελματικό", en: "Professional" },
  luxury: { el: "Πολυτελές", en: "Luxury" },
  friendly: { el: "Φιλικό", en: "Friendly" },
  investment: { el: "Επενδυτικό", en: "Investment" },
};

export function AIDescriptionGenerator({
  propertyData,
  propertyId,
  onDescriptionGenerated,
  currentDescription,
  disabled = false,
  className,
}: AIDescriptionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState<DescriptionTone>("professional");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("el");
  const { toast } = useAppToast();

  const hasMinimumData = () => {
    return propertyData.property_type && (propertyData.municipality || propertyData.area);
  };

  const generateDescription = async (tone: DescriptionTone, language: Language) => {
    if (!hasMinimumData()) {
      toast.error("Ελλιπή στοιχεία", {
        description: "Παρακαλώ συμπληρώστε τουλάχιστον τον τύπο και την τοποθεσία του ακινήτου.",
        isTranslationKey: false,
      });
      return;
    }

    setIsGenerating(true);
    setSelectedTone(tone);
    setSelectedLanguage(language);

    try {
      const response = await fetch("/api/ai/generate-property-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyData,
          propertyId,
          language,
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate description");
      }

      if (data.success && data.description) {
        onDescriptionGenerated(data.description);
        toast.success("Επιτυχία", {
          description: `Η περιγραφή δημιουργήθηκε${data.imagesAnalyzed > 0 ? ` (με ανάλυση ${data.imagesAnalyzed} φωτογραφιών)` : ""}.`,
          isTranslationKey: false,
        });
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (error) {
      console.error("Error generating description:", error);
      const errorMessage = error instanceof Error ? error.message : "Σφάλμα κατά τη δημιουργία περιγραφής";
      toast.error("Σφάλμα", {
        description: errorMessage,
        isTranslationKey: false,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickGenerate = () => {
    generateDescription(selectedTone, selectedLanguage);
  };

  const handleToneSelect = (tone: DescriptionTone) => {
    generateDescription(tone, selectedLanguage);
  };

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
  };

  if (!hasMinimumData()) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className={className}
        title="Συμπληρώστε τουλάχιστον τον τύπο και την τοποθεσία"
        leftIcon={<Sparkles className="h-4 w-4" />}
      >
        AI Περιγραφή
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quick generate button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleQuickGenerate}
        disabled={disabled || isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : currentDescription ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isGenerating
          ? "Δημιουργία..."
          : currentDescription
          ? "Αναδημιουργία"
          : "AI Περιγραφή"}
      </Button>

      {/* Options dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isGenerating}
            className="px-2"
          >
            <Languages className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Επιλογές AI</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Tone options */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sparkles className="h-4 w-4 mr-2" />
              Ύφος: {TONE_LABELS[selectedTone].el}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(Object.keys(TONE_LABELS) as DescriptionTone[]).map((tone) => (
                <DropdownMenuItem
                  key={tone}
                  onClick={() => handleToneSelect(tone)}
                  className={selectedTone === tone ? "bg-accent" : ""}
                >
                  {TONE_LABELS[tone].el}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Language options */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages className="h-4 w-4 mr-2" />
              Γλώσσα: {selectedLanguage === "el" ? "Ελληνικά" : "English"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handleLanguageChange("el")}
                className={selectedLanguage === "el" ? "bg-accent" : ""}
              >
                Ελληνικά
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLanguageChange("en")}
                className={selectedLanguage === "en" ? "bg-accent" : ""}
              >
                English
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          
          {/* Generate with current settings */}
          <DropdownMenuItem
            onClick={handleQuickGenerate}
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Δημιουργία τώρα
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Export a simple inline version for compact spaces
export function AIDescriptionButton({
  propertyData,
  propertyId,
  onDescriptionGenerated,
  disabled = false,
}: Omit<AIDescriptionGeneratorProps, "currentDescription" | "className">) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useAppToast();

  const hasMinimumData = () => {
    return propertyData.property_type && (propertyData.municipality || propertyData.area);
  };

  const generateDescription = async () => {
    if (!hasMinimumData()) {
      toast.error("Ελλιπή στοιχεία", {
        description: "Παρακαλώ συμπληρώστε τουλάχιστον τον τύπο και την τοποθεσία του ακινήτου.",
        isTranslationKey: false,
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-property-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyData,
          propertyId,
          language: "el",
          tone: "professional",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate description");
      }

      if (data.success && data.description) {
        onDescriptionGenerated(data.description);
        toast.success("Επιτυχία", {
          description: "Η περιγραφή δημιουργήθηκε επιτυχώς.",
          isTranslationKey: false,
        });
      }
    } catch (error) {
      console.error("Error generating description:", error);
      const errorMessage = error instanceof Error ? error.message : "Σφάλμα κατά τη δημιουργία περιγραφής";
      toast.error("Σφάλμα", {
        description: errorMessage,
        isTranslationKey: false,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={generateDescription}
      disabled={disabled || isGenerating || !hasMinimumData()}
      title={hasMinimumData() ? "Δημιουργία περιγραφής με AI" : "Συμπληρώστε τουλάχιστον τον τύπο και την τοποθεσία"}
      className="h-8 px-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
    </Button>
  );
}
