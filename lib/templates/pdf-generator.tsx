import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
// TemplateType is used via definition.type in switch statement
import type { TemplateDefinition, TemplatePlaceholder } from "./template-definitions";
import { formatValue } from "./auto-fill";

// Register a font that supports Greek characters
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 11,
    padding: 40,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "40%",
    fontWeight: "bold",
  },
  value: {
    width: "60%",
  },
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    textAlign: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 50,
    paddingTop: 5,
  },
  datePlace: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
  },
  legalText: {
    fontSize: 9,
    color: "#666",
    marginTop: 20,
    textAlign: "justify",
  },
});

interface TemplateData {
  values: Record<string, string>;
  locale: "en" | "el";
}

// Field renderer helper
function renderField(
  placeholder: TemplatePlaceholder,
  value: string,
  locale: "en" | "el"
): React.ReactNode {
  const label = locale === "el" ? placeholder.labelEl : placeholder.labelEn;
  const formattedValue = formatValue(value || "-", placeholder.type, locale);

  return (
    <View style={styles.row} key={placeholder.key}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{formattedValue}</Text>
    </View>
  );
}

// ============================================
// BROKERAGE MANDATE TEMPLATE
// ============================================
function BrokerageMandate({
  definition,
  data,
}: {
  definition: TemplateDefinition;
  data: TemplateData;
}) {
  const { values, locale } = data;
  const t = locale === "el";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t ? "ΕΝΤΟΛΗ ΑΝΑΘΕΣΗΣ ΜΕΣΙΤΕΙΑΣ" : "BROKERAGE MANDATE"}
          </Text>
          <Text style={styles.subtitle}>
            {t
              ? "Ιδιωτικό Συμφωνητικό Ανάθεσης Μεσιτικής Εργασίας"
              : "Private Agreement for Real Estate Brokerage Services"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΕΝΤΟΛΕΑ (ΙΔΙΟΚΤΗΤΗ)" : "PRINCIPAL (OWNER) DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "owner_name")!,
            values.owner_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "owner_id_number")!,
            values.owner_id_number,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "owner_afm")!,
            values.owner_afm,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "owner_address")!,
            values.owner_address,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "owner_phone")!,
            values.owner_phone,
            locale
          )}
          {values.owner_email &&
            renderField(
              definition.placeholders.find((p) => p.key === "owner_email")!,
              values.owner_email,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "property_address")!,
            values.property_address,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_area")!,
            values.property_area,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_type")!,
            values.property_type,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_size")!,
            values.property_size,
            locale
          )}
          {values.property_floor &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_floor")!,
              values.property_floor,
              locale
            )}
          {values.property_kaek &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_kaek")!,
              values.property_kaek,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΟΡΟΙ ΑΝΑΘΕΣΗΣ" : "MANDATE TERMS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "transaction_type")!,
            values.transaction_type,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "asking_price")!,
            values.asking_price,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "commission_percentage")!,
            values.commission_percentage + "%",
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "is_exclusive")!,
            values.is_exclusive,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "mandate_duration_months")!,
            values.mandate_duration_months,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "mandate_start_date")!,
            values.mandate_start_date,
            locale
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΜΕΣΙΤΙΚΟΥ ΓΡΑΦΕΙΟΥ" : "AGENCY DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "agency_name")!,
            values.agency_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "agency_afm")!,
            values.agency_afm,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "agent_name")!,
            values.agent_name,
            locale
          )}
        </View>

        <Text style={styles.legalText}>
          {t
            ? "Ο εντολέας αναθέτει στο ανωτέρω μεσιτικό γραφείο την αποκλειστική ή μη διαμεσολάβηση για την πώληση ή μίσθωση του περιγραφόμενου ακινήτου, σύμφωνα με τους όρους που αναφέρονται παραπάνω και τις διατάξεις του Π.Δ. 248/1993."
            : "The principal assigns to the above real estate agency the exclusive or non-exclusive mediation for the sale or rental of the described property, according to the terms mentioned above and the provisions of P.D. 248/1993."}
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Εντολέας" : "The Principal"}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Μεσίτης" : "The Agent"}
            </Text>
          </View>
        </View>

        <Text style={styles.datePlace}>
          {values.place_of_signing}, {formatValue(values.mandate_start_date, "date", locale)}
        </Text>

        <Text style={styles.footer}>
          {t
            ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
            : "This document was generated via the Oikion platform"}
        </Text>
      </Page>
    </Document>
  );
}

// ============================================
// LEASE AGREEMENT TEMPLATE
// ============================================
function LeaseAgreement({
  definition,
  data,
}: {
  definition: TemplateDefinition;
  data: TemplateData;
}) {
  const { values, locale } = data;
  const t = locale === "el";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t
              ? "ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ ΜΙΣΘΩΣΗΣ ΚΑΤΟΙΚΙΑΣ"
              : "RESIDENTIAL LEASE AGREEMENT"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΕΚΜΙΣΘΩΤΗ" : "LANDLORD DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_name")!,
            values.landlord_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_id_number")!,
            values.landlord_id_number,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_afm")!,
            values.landlord_afm,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_address")!,
            values.landlord_address,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_phone")!,
            values.landlord_phone,
            locale
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΜΙΣΘΩΤΗ" : "TENANT DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_name")!,
            values.tenant_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_id_number")!,
            values.tenant_id_number,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_afm")!,
            values.tenant_afm,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_phone")!,
            values.tenant_phone,
            locale
          )}
          {values.tenant_email &&
            renderField(
              definition.placeholders.find((p) => p.key === "tenant_email")!,
              values.tenant_email,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΜΙΣΘΙΟΥ" : "PROPERTY DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "property_address")!,
            values.property_address,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_area")!,
            values.property_area,
            locale
          )}
          {values.property_floor &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_floor")!,
              values.property_floor,
              locale
            )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_size")!,
            values.property_size,
            locale
          )}
          {values.property_bedrooms &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_bedrooms")!,
              values.property_bedrooms,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΟΡΟΙ ΜΙΣΘΩΣΗΣ" : "LEASE TERMS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "monthly_rent")!,
            values.monthly_rent,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "deposit_amount")!,
            values.deposit_amount,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "payment_day")!,
            values.payment_day,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "lease_start_date")!,
            values.lease_start_date,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "lease_duration_years")!,
            values.lease_duration_years,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "permitted_use")!,
            values.permitted_use,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "utilities_included")!,
            values.utilities_included,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "pets_allowed")!,
            values.pets_allowed,
            locale
          )}
        </View>

        <Text style={styles.legalText}>
          {t
            ? "Το παρόν μισθωτήριο συμφωνητικό διέπεται από τις διατάξεις του Αστικού Κώδικα και του Ν. 4242/2014 περί μισθώσεων αστικών ακινήτων. Αμφότερα τα συμβαλλόμενα μέρη αποδέχονται τους ανωτέρω όρους."
            : "This lease agreement is governed by the provisions of the Civil Code and Law 4242/2014 regarding urban property leases. Both contracting parties accept the above terms."}
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Εκμισθωτής" : "The Landlord"}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Μισθωτής" : "The Tenant"}
            </Text>
          </View>
        </View>

        <Text style={styles.datePlace}>
          {values.place_of_signing}, {formatValue(values.lease_start_date, "date", locale)}
        </Text>

        <Text style={styles.footer}>
          {t
            ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
            : "This document was generated via the Oikion platform"}
        </Text>
      </Page>
    </Document>
  );
}

// ============================================
// HANDOVER PROTOCOL TEMPLATE
// ============================================
function HandoverProtocol({
  definition,
  data,
}: {
  definition: TemplateDefinition;
  data: TemplateData;
}) {
  const { values, locale } = data;
  const t = locale === "el";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t
              ? "ΠΡΩΤΟΚΟΛΛΟ ΠΑΡΑΔΟΣΗΣ - ΠΑΡΑΛΑΒΗΣ"
              : "PROPERTY HANDOVER PROTOCOL"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ" : "PARTIES INVOLVED"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_name")!,
            values.landlord_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "landlord_phone")!,
            values.landlord_phone,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_buyer_name")!,
            values.tenant_buyer_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "tenant_buyer_phone")!,
            values.tenant_buyer_phone,
            locale
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "property_address")!,
            values.property_address,
            locale
          )}
          {values.property_floor &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_floor")!,
              values.property_floor,
              locale
            )}
          {renderField(
            definition.placeholders.find((p) => p.key === "handover_date")!,
            values.handover_date,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "handover_type")!,
            values.handover_type,
            locale
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΕΝΔΕΙΞΕΙΣ ΜΕΤΡΗΤΩΝ" : "METER READINGS"}
          </Text>
          {values.electricity_meter_number &&
            renderField(
              definition.placeholders.find((p) => p.key === "electricity_meter_number")!,
              values.electricity_meter_number,
              locale
            )}
          {values.electricity_reading &&
            renderField(
              definition.placeholders.find((p) => p.key === "electricity_reading")!,
              values.electricity_reading,
              locale
            )}
          {values.water_meter_number &&
            renderField(
              definition.placeholders.find((p) => p.key === "water_meter_number")!,
              values.water_meter_number,
              locale
            )}
          {values.water_reading &&
            renderField(
              definition.placeholders.find((p) => p.key === "water_reading")!,
              values.water_reading,
              locale
            )}
          {values.gas_meter_number &&
            renderField(
              definition.placeholders.find((p) => p.key === "gas_meter_number")!,
              values.gas_meter_number,
              locale
            )}
          {values.gas_reading &&
            renderField(
              definition.placeholders.find((p) => p.key === "gas_reading")!,
              values.gas_reading,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΚΛΕΙΔΙΑ" : "KEYS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "main_door_keys")!,
            values.main_door_keys,
            locale
          )}
          {values.building_entrance_keys &&
            renderField(
              definition.placeholders.find((p) => p.key === "building_entrance_keys")!,
              values.building_entrance_keys,
              locale
            )}
          {values.mailbox_keys &&
            renderField(
              definition.placeholders.find((p) => p.key === "mailbox_keys")!,
              values.mailbox_keys,
              locale
            )}
          {values.garage_remote &&
            renderField(
              definition.placeholders.find((p) => p.key === "garage_remote")!,
              values.garage_remote,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΚΑΤΑΣΤΑΣΗ ΑΚΙΝΗΤΟΥ" : "PROPERTY CONDITION"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "overall_condition")!,
            values.overall_condition,
            locale
          )}
          {values.condition_notes &&
            renderField(
              definition.placeholders.find((p) => p.key === "condition_notes")!,
              values.condition_notes,
              locale
            )}
          {values.furniture_inventory &&
            renderField(
              definition.placeholders.find((p) => p.key === "furniture_inventory")!,
              values.furniture_inventory,
              locale
            )}
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Παραδίδων" : "The Deliverer"}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Παραλαμβάνων" : "The Receiver"}
            </Text>
          </View>
        </View>

        <Text style={styles.datePlace}>
          {values.place_of_signing}, {formatValue(values.handover_date, "date", locale)}
        </Text>

        <Text style={styles.footer}>
          {t
            ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
            : "This document was generated via the Oikion platform"}
        </Text>
      </Page>
    </Document>
  );
}

// ============================================
// VIEWING CONFIRMATION TEMPLATE
// ============================================
function ViewingConfirmation({
  definition,
  data,
}: {
  definition: TemplateDefinition;
  data: TemplateData;
}) {
  const { values, locale } = data;
  const t = locale === "el";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t ? "ΒΕΒΑΙΩΣΗ ΕΠΙΣΚΕΨΗΣ ΑΚΙΝΗΤΟΥ" : "PROPERTY VIEWING CONFIRMATION"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΠΤΗ" : "VISITOR DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "visitor_name")!,
            values.visitor_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "visitor_id_number")!,
            values.visitor_id_number,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "visitor_phone")!,
            values.visitor_phone,
            locale
          )}
          {values.visitor_email &&
            renderField(
              definition.placeholders.find((p) => p.key === "visitor_email")!,
              values.visitor_email,
              locale
            )}
          {renderField(
            definition.placeholders.find((p) => p.key === "visitor_intent")!,
            values.visitor_intent,
            locale
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΑΚΙΝΗΤΟΥ" : "PROPERTY DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "property_address")!,
            values.property_address,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_area")!,
            values.property_area,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "property_type")!,
            values.property_type,
            locale
          )}
          {values.property_code &&
            renderField(
              definition.placeholders.find((p) => p.key === "property_code")!,
              values.property_code,
              locale
            )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t ? "ΣΤΟΙΧΕΙΑ ΕΠΙΣΚΕΨΗΣ" : "VIEWING DETAILS"}
          </Text>
          {renderField(
            definition.placeholders.find((p) => p.key === "viewing_date")!,
            values.viewing_date,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "viewing_time")!,
            values.viewing_time,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "agency_name")!,
            values.agency_name,
            locale
          )}
          {renderField(
            definition.placeholders.find((p) => p.key === "agent_name")!,
            values.agent_name,
            locale
          )}
          {values.agent_phone &&
            renderField(
              definition.placeholders.find((p) => p.key === "agent_phone")!,
              values.agent_phone,
              locale
            )}
        </View>

        <Text style={styles.legalText}>
          {t
            ? "Με την υπογραφή του παρόντος, ο επισκέπτης βεβαιώνει ότι επισκέφθηκε το ανωτέρω ακίνητο μέσω του αναφερόμενου μεσιτικού γραφείου και αναγνωρίζει το δικαίωμα του γραφείου στη νόμιμη αμοιβή σε περίπτωση κατάρτισης συμφωνίας για το εν λόγω ακίνητο."
            : "By signing this document, the visitor confirms that they visited the above property through the mentioned real estate agency and acknowledges the agency's right to lawful commission in case of an agreement being reached for the said property."}
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Επισκέπτης" : "The Visitor"}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              {t ? "Ο Μεσίτης" : "The Agent"}
            </Text>
          </View>
        </View>

        <Text style={styles.datePlace}>
          {values.place_of_signing}, {formatValue(values.viewing_date, "date", locale)}
        </Text>

        <Text style={styles.footer}>
          {t
            ? "Το παρόν έγγραφο δημιουργήθηκε μέσω της πλατφόρμας Oikion"
            : "This document was generated via the Oikion platform"}
        </Text>
      </Page>
    </Document>
  );
}

// ============================================
// MAIN PDF GENERATION FUNCTION
// ============================================
export async function generatePDF(
  definition: TemplateDefinition,
  values: Record<string, string>,
  locale: "en" | "el" = "el"
): Promise<Blob> {
  const data: TemplateData = { values, locale };

  let document: React.ReactElement;

  switch (definition.type) {
    case "BROKERAGE_MANDATE":
      document = <BrokerageMandate definition={definition} data={data} />;
      break;
    case "LEASE_AGREEMENT":
      document = <LeaseAgreement definition={definition} data={data} />;
      break;
    case "HANDOVER_PROTOCOL":
      document = <HandoverProtocol definition={definition} data={data} />;
      break;
    case "VIEWING_CONFIRMATION":
      document = <ViewingConfirmation definition={definition} data={data} />;
      break;
    default:
      throw new Error(`Unknown template type: ${definition.type}`);
  }

  // Type assertion needed because pdf() expects a specific type from @react-pdf/renderer
  // but our components are compatible ReactElement types
  const blob = await pdf(document as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
  return blob;
}

// Helper to generate filename
export function generateFilename(
  definition: TemplateDefinition,
  locale: "en" | "el" = "el"
): string {
  const name = locale === "el" ? definition.nameEl : definition.nameEn;
  const date = new Date().toISOString().split("T")[0];
  const sanitizedName = name.replace(/[^a-zA-Z0-9\u0370-\u03FF\s]/g, "").replace(/\s+/g, "_");
  return `${sanitizedName}_${date}.pdf`;
}




