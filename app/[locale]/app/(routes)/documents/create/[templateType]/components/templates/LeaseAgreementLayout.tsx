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

export function LeaseAgreementLayout({
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
        title={
          isGreek
            ? "ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ ΜΙΣΘΩΣΗΣ ΚΑΤΟΙΚΙΑΣ"
            : "RESIDENTIAL LEASE AGREEMENT"
        }
      />

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΕΚΜΙΣΘΩΤΗ" : "LANDLORD DETAILS"}
      >
        {renderField("landlord_name")}
        {renderField("landlord_id_number")}
        {renderField("landlord_afm")}
        {renderField("landlord_address")}
        {renderField("landlord_phone")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΜΙΣΘΩΤΗ" : "TENANT DETAILS"}
      >
        {renderField("tenant_name")}
        {renderField("tenant_id_number")}
        {renderField("tenant_afm")}
        {renderField("tenant_phone")}
        {renderField("tenant_email")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΜΙΣΘΙΟΥ" : "PROPERTY DETAILS"}
      >
        {renderField("property_address")}
        {renderField("property_area")}
        {renderField("property_floor")}
        {renderField("property_size")}
        {renderField("property_bedrooms")}
        {renderField("property_description")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΟΡΟΙ ΜΙΣΘΩΣΗΣ" : "LEASE TERMS"}
      >
        {renderField("monthly_rent")}
        {renderField("deposit_amount")}
        {renderField("payment_day")}
        {renderField("lease_start_date")}
        {renderField("lease_duration_years")}
        {renderField("permitted_use")}
        {renderField("utilities_included")}
        {renderField("pets_allowed")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΤΟΠΟΣ ΥΠΟΓΡΑΦΗΣ" : "SIGNING LOCATION"}
      >
        {renderField("place_of_signing")}
      </DocumentSection>

      <LegalText>
        {isGreek
          ? "Το παρόν μισθωτήριο συμφωνητικό διέπεται από τις διατάξεις του Αστικού Κώδικα και του Ν. 4242/2014 περί μισθώσεων αστικών ακινήτων. Αμφότερα τα συμβαλλόμενα μέρη αποδέχονται τους ανωτέρω όρους."
          : "This lease agreement is governed by the provisions of the Civil Code and Law 4242/2014 regarding urban property leases. Both contracting parties accept the above terms."}
      </LegalText>

      <SignatureSection
        leftLabel={isGreek ? "Ο Εκμισθωτής" : "The Landlord"}
        rightLabel={isGreek ? "Ο Μισθωτής" : "The Tenant"}
        locale={locale}
      />

      <DatePlaceText
        place={values.place_of_signing || ""}
        date={values.lease_start_date || ""}
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







