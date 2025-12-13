"use client";

import { FieldRow } from "../EditableField";
import {
  DocumentHeader,
  DocumentSection,
  SignatureSection,
  LegalText,
  DatePlaceText,
} from "../DocumentCanvas";
import type { TemplateDefinition } from "@/lib/templates";

interface TemplateLayoutProps {
  readonly definition: TemplateDefinition;
  readonly values: Record<string, string>;
  readonly locale: "en" | "el";
  readonly isPreview?: boolean;
  readonly onValueChange: (key: string, value: string) => void;
}

export function ViewingConfirmationLayout({
  definition,
  values,
  locale,
  isPreview = false,
  onValueChange,
}: TemplateLayoutProps) {
  const isGreek = locale === "el";

  const getPlaceholder = (key: string) =>
    definition.placeholders.find((p) => p.key === key)!;

  const renderField = (key: string) => {
    const placeholder = getPlaceholder(key);
    if (!placeholder) return null;
    return (
      <FieldRow
        key={key}
        placeholder={placeholder}
        value={values[key] || ""}
        locale={locale}
        isPreview={isPreview}
        onChange={(value) => onValueChange(key, value)}
      />
    );
  };

  return (
    <div className="relative min-h-full">
      <DocumentHeader
        title={
          isGreek
            ? "ΒΕΒΑΙΩΣΗ ΕΠΙΣΚΕΨΗΣ ΑΚΙΝΗΤΟΥ"
            : "PROPERTY VIEWING CONFIRMATION"
        }
      />

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΠΤΗ" : "VISITOR DETAILS"}
      >
        {renderField("visitor_name")}
        {renderField("visitor_id_number")}
        {renderField("visitor_phone")}
        {renderField("visitor_email")}
        {renderField("visitor_intent")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
      >
        {renderField("property_address")}
        {renderField("property_area")}
        {renderField("property_type")}
        {renderField("property_code")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΨΗΣ" : "VIEWING DETAILS"}
      >
        {renderField("viewing_date")}
        {renderField("viewing_time")}
        {renderField("agency_name")}
        {renderField("agent_name")}
        {renderField("agent_phone")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΤΟΠΟΣ ΥΠΟΓΡΑΦΗΣ" : "SIGNING LOCATION"}
      >
        {renderField("place_of_signing")}
      </DocumentSection>

      <LegalText>
        {isGreek
          ? "Με την υπογραφή του παρόντος, ο επισκέπτης βεβαιώνει ότι επισκέφθηκε το ανωτέρω ακίνητο μέσω του αναφερόμενου μεσιτικού γραφείου και αναγνωρίζει το δικαίωμα του γραφείου στη νόμιμη αμοιβή σε περίπτωση κατάρτισης συμφωνίας για το εν λόγω ακίνητο."
          : "By signing this document, the visitor confirms that they visited the above property through the mentioned real estate agency and acknowledges the agency's right to lawful commission in case of an agreement being reached for the said property."}
      </LegalText>

      <SignatureSection
        leftLabel={isGreek ? "Ο Επισκέπτης" : "The Visitor"}
        rightLabel={isGreek ? "Ο Μεσίτης" : "The Agent"}
        locale={locale}
      />

      <DatePlaceText
        place={values.place_of_signing || ""}
        date={values.viewing_date || ""}
        locale={locale}
      />

      <div className="text-center text-[9px] text-gray-400 mt-8 pt-4">
        {isGreek
          ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
          : "This document was generated via the Oikion platform"}
      </div>
    </div>
  );
}

