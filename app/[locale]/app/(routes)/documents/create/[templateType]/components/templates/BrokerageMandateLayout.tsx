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
  readonly registerFieldRef?: (key: string, ref: HTMLInputElement | HTMLButtonElement | null) => void;
}

export function BrokerageMandateLayout({
  definition,
  values,
  locale,
  isPreview = false,
  onValueChange,
  registerFieldRef,
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
        fieldKey={key}
        registerFieldRef={registerFieldRef}
      />
    );
  };

  return (
    <div className="relative min-h-full">
      <DocumentHeader
        title={isGreek ? "ΕΝΤΟΛΗ ΑΝΑΘΕΣΗΣ ΜΕΣΙΤΕΙΑΣ" : "BROKERAGE MANDATE"}
        subtitle={
          isGreek
            ? "Ιδιωτικό Συμφωνητικό Ανάθεσης Μεσιτικής Εργασίας"
            : "Private Agreement for Real Estate Brokerage Services"
        }
      />

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΕΝΤΟΛΕΑ (ΙΔΙΟΚΤΗΤΗ)" : "PRINCIPAL (OWNER) DETAILS"}
      >
        {renderField("owner_name")}
        {renderField("owner_id_number")}
        {renderField("owner_afm")}
        {renderField("owner_address")}
        {renderField("owner_phone")}
        {renderField("owner_email")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
      >
        {renderField("property_address")}
        {renderField("property_area")}
        {renderField("property_type")}
        {renderField("property_size")}
        {renderField("property_floor")}
        {renderField("property_kaek")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΟΡΟΙ ΑΝΑΘΕΣΗΣ" : "MANDATE TERMS"}
      >
        {renderField("transaction_type")}
        {renderField("asking_price")}
        {renderField("commission_percentage")}
        {renderField("is_exclusive")}
        {renderField("mandate_duration_months")}
        {renderField("mandate_start_date")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΜΕΣΙΤΙΚΟΥ ΓΡΑΦΕΙΟΥ" : "AGENCY DETAILS"}
      >
        {renderField("agency_name")}
        {renderField("agency_afm")}
        {renderField("agent_name")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΤΟΠΟΣ ΥΠΟΓΡΑΦΗΣ" : "SIGNING LOCATION"}
      >
        {renderField("place_of_signing")}
      </DocumentSection>

      <LegalText>
        {isGreek
          ? "Ο εντολέας αναθέτει στο ανωτέρω μεσιτικό γραφείο την αποκλειστική ή μη διαμεσολάβηση για την πώληση ή μίσθωση του περιγραφόμενου ακινήτου, σύμφωνα με τους όρους που αναφέρονται παραπάνω και τις διατάξεις του Π.Δ. 248/1993."
          : "The principal assigns to the above real estate agency the exclusive or non-exclusive mediation for the sale or rental of the described property, according to the terms mentioned above and the provisions of P.D. 248/1993."}
      </LegalText>

      <SignatureSection
        leftLabel={isGreek ? "Ο Εντολέας" : "The Principal"}
        rightLabel={isGreek ? "Ο Μεσίτης" : "The Agent"}
        locale={locale}
      />

      <DatePlaceText
        place={values.place_of_signing || ""}
        date={values.mandate_start_date || ""}
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







