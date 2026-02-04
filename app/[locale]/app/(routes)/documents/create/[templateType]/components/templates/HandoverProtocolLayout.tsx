"use client";

import { FieldRow } from "../EditableField";
import {
  DocumentHeader,
  DocumentSection,
  SignatureSection,
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

export function HandoverProtocolLayout({
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
            ? "ΠΡΩΤΟΚΟΛΛΟ ΠΑΡΑΔΟΣΗΣ - ΠΑΡΑΛΑΒΗΣ"
            : "PROPERTY HANDOVER PROTOCOL"
        }
      />

      <DocumentSection
        title={isGreek ? "ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ" : "PARTIES INVOLVED"}
      >
        {renderField("landlord_name")}
        {renderField("landlord_phone")}
        {renderField("tenant_buyer_name")}
        {renderField("tenant_buyer_phone")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
      >
        {renderField("property_address")}
        {renderField("property_floor")}
        {renderField("handover_date")}
        {renderField("handover_type")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΕΝΔΕΙΞΕΙΣ ΜΕΤΡΗΤΩΝ" : "METER READINGS"}
      >
        {renderField("electricity_meter_number")}
        {renderField("electricity_reading")}
        {renderField("water_meter_number")}
        {renderField("water_reading")}
        {renderField("gas_meter_number")}
        {renderField("gas_reading")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΚΛΕΙΔΙΑ" : "KEYS"}
      >
        {renderField("main_door_keys")}
        {renderField("building_entrance_keys")}
        {renderField("mailbox_keys")}
        {renderField("garage_remote")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΚΑΤΑΣΤΑΣΗ ΑΚΙΝΗΤΟΥ" : "PROPERTY CONDITION"}
      >
        {renderField("overall_condition")}
        {renderField("condition_notes")}
        {renderField("furniture_inventory")}
      </DocumentSection>

      <DocumentSection
        title={isGreek ? "ΤΟΠΟΣ ΥΠΟΓΡΑΦΗΣ" : "SIGNING LOCATION"}
      >
        {renderField("place_of_signing")}
      </DocumentSection>

      <SignatureSection
        leftLabel={isGreek ? "Ο Παραδίδων" : "The Deliverer"}
        rightLabel={isGreek ? "Ο Παραλαμβάνων" : "The Receiver"}
        locale={locale}
      />

      <DatePlaceText
        place={values.place_of_signing || ""}
        date={values.handover_date || ""}
        locale={locale}
      />

      <div className="text-center text-[9px] text-muted-foreground mt-8 pt-4">
        {isGreek
          ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
          : "This document was generated via the Oikion platform"}
      </div>
    </div>
  );
}







