import {
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface PropertyInquiryAgentEmailProps {
  agentName: string;
  inquirerName: string;
  inquirerEmail: string;
  inquirerPhone: string;
  propertyType: string;
  location: string;
  budget: string;
  bedrooms: string;
  timeline: string;
  message: string;
  inquiryId: string;
  locale?: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const PropertyInquiryAgentEmail = ({
  agentName,
  inquirerName,
  inquirerEmail,
  inquirerPhone,
  propertyType,
  location,
  budget,
  bedrooms,
  timeline,
  message,
  inquiryId,
  locale = "en",
  userTheme,
}: PropertyInquiryAgentEmailProps) => {
  const colors = resolveColors(userTheme);
  const isGreek = locale === "el";

  const previewText = isGreek
    ? `Νέο αίτημα ανάθεσης από ${inquirerName}`
    : `New property inquiry from ${inquirerName}`;

  const formatPropertyType = (type: string) => {
    const types: Record<string, { el: string; en: string }> = {
      apartment: { el: "Διαμέρισμα", en: "Apartment" },
      house: { el: "Μονοκατοικία", en: "House" },
      commercial: { el: "Επαγγελματικό", en: "Commercial" },
      land: { el: "Οικόπεδο", en: "Land" },
      other: { el: "Άλλο", en: "Other" },
    };
    return isGreek ? types[type]?.el || type : types[type]?.en || type;
  };

  const formatTimeline = (t: string) => {
    const timelines: Record<string, { el: string; en: string }> = {
      immediate: { el: "Άμεσα", en: "Immediate" },
      "1-3months": { el: "1-3 μήνες", en: "1-3 months" },
      "3-6months": { el: "3-6 μήνες", en: "3-6 months" },
      "6+months": { el: "6+ μήνες", en: "6+ months" },
    };
    return isGreek ? timelines[t]?.el || t : timelines[t]?.en || t;
  };

  return (
    <BaseLayout
      previewText={previewText}
      footerText={
        isGreek
          ? "Μπορείτε να απαντήσετε απευθείας στο email του ενδιαφερομένου ή να διαχειριστείτε το αίτημα στο Oikion."
          : "You can reply directly to the inquirer's email or manage this inquiry in Oikion."
      }
      footerNote={`Inquiry ID: ${inquiryId}`}
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-6"
      >
        {isGreek ? "Νέο Αίτημα Ανάθεσης" : "New Property Inquiry"}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {isGreek ? `Γεια σου ${agentName},` : `Hi ${agentName},`}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {isGreek
          ? "Λάβατε νέο αίτημα ανάθεσης από πιθανό πελάτη. Παρακάτω είναι οι λεπτομέρειες:"
          : "You received a new property inquiry from a potential client. Here are the details:"}
      </Text>

      {/* Contact info */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase m-0 mb-1">
          {isGreek ? "Επικοινωνία:" : "Contact:"}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-2">
          {inquirerName}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-2">
          <Link href={`mailto:${inquirerEmail}`} style={{ color: colors.linkColor }}>
            {inquirerEmail}
          </Link>
        </Text>
        {inquirerPhone && inquirerPhone !== "Not provided" && (
          <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0">
            <Link href={`tel:${inquirerPhone}`} style={{ color: colors.linkColor }}>
              {inquirerPhone}
            </Link>
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Property Details */}
      <Section className="mb-6">
        <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0 mb-4">
          {isGreek ? "Λεπτομέρειες Ακινήτου:" : "Property Details:"}
        </Text>

        <div style={{ marginBottom: "12px" }}>
          <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
            {isGreek ? "Τύπος Ακινήτου:" : "Property Type:"}
          </Text>
          <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
            {formatPropertyType(propertyType)}
          </Text>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
            {isGreek ? "Περιοχή:" : "Location:"}
          </Text>
          <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
            {location}
          </Text>
        </div>

        {budget && (
          <div style={{ marginBottom: "12px" }}>
            <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
              {isGreek ? "Προϋπολογισμός:" : "Budget:"}
            </Text>
            <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
              {budget}
            </Text>
          </div>
        )}

        {bedrooms && (
          <div style={{ marginBottom: "12px" }}>
            <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
              {isGreek ? "Υπνοδωμάτια:" : "Bedrooms:"}
            </Text>
            <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
              {bedrooms}
            </Text>
          </div>
        )}

        <div style={{ marginBottom: "12px" }}>
          <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
            {isGreek ? "Χρονοδιάγραμμα:" : "Timeline:"}
          </Text>
          <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
            {formatTimeline(timeline)}
          </Text>
        </div>

        {message && (
          <>
            <Hr style={{ borderColor: colors.hrColor }} className="my-4" />
            <div style={{ marginBottom: "12px" }}>
              <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
                {isGreek ? "Μήνυμα:" : "Message:"}
              </Text>
              <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
                {message}
              </Text>
            </div>
          </>
        )}
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* CTA */}
      <Section className="text-center my-8">
        <Link
          href={`${baseUrl}/app/assignments`}
          style={{
            backgroundColor: colors.buttonBg,
            color: colors.buttonText,
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "14px",
            fontWeight: "600",
            padding: "12px 24px",
            textDecoration: "none",
          }}
        >
          {isGreek ? "Προβολή Αιτημάτων" : "View Assignments"}
        </Link>
      </Section>
    </BaseLayout>
  );
};

export default PropertyInquiryAgentEmail;
