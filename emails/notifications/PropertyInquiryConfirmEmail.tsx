import {
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface PropertyInquiryConfirmEmailProps {
  inquirerName: string;
  agentName: string;
  inquiryId?: string;
  locale?: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const PropertyInquiryConfirmEmail = ({
  inquirerName,
  agentName,
  inquiryId,
  locale = "en",
  userTheme,
}: PropertyInquiryConfirmEmailProps) => {
  const colors = resolveColors(userTheme);
  const isGreek = locale === "el";

  const previewText = isGreek
    ? "Λάβαμε το αίτημά σας ανάθεσης"
    : "We received your property inquiry";

  return (
    <BaseLayout
      previewText={previewText}
      footerText={
        isGreek
          ? "Αν δεν υπέβαλες αυτό το αίτημα, μπορείς να αγνοήσεις αυτό το email."
          : "If you didn't submit this inquiry, you can safely ignore this email."
      }
      footerNote={inquiryId ? `Inquiry ID: ${inquiryId}` : undefined}
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-6"
      >
        {isGreek ? "Επιβεβαίωση Αιτήματος Ανάθεσης" : "Inquiry Confirmed"}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {isGreek ? `Γεια σου ${inquirerName},` : `Hi ${inquirerName},`}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {isGreek
          ? `Ευχαριστούμε που επικοινώνησες μαζί μας! Λάβαμε το αίτημά σου ανάθεσης και το στείλαμε στον/στην ${agentName}.`
          : `Thank you for reaching out! We've received your property inquiry and sent it to ${agentName}.`}
      </Text>

      {/* Highlight box */}
      <Section className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-5 mb-6">
        <Text className="text-blue-900 text-base font-medium m-0">
          {isGreek
            ? `Ο/Η ${agentName} θα επικοινωνήσει μαζί σου σύντομα για να συζητήσετε τις ανάγκες σου.`
            : `${agentName} will get in touch with you soon to discuss your needs.`}
        </Text>
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {isGreek ? "Στο μεταξύ, μπορείς να:" : "In the meantime, you can:"}
      </Text>

      <Section className="mb-6">
        <Text style={{ color: colors.textSecondary }} className="text-sm leading-7 m-0">
          {isGreek
            ? "• Εξερεύνησε τα διαθέσιμα ακίνητα στην πλατφόρμα μας"
            : "• Explore available properties on our platform"}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm leading-7 m-0">
          {isGreek
            ? "• Δημιούργησε λογαριασμό για να παρακολουθείς την πρόοδο του αιτήματός σου"
            : "• Create an account to track your inquiry progress"}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm leading-7 m-0">
          {isGreek
            ? "• Συνδέσου με άλλους επαγγελματίες ακινήτων"
            : "• Connect with other real estate professionals"}
        </Text>
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* CTA */}
      <Section className="text-center my-8">
        <Link
          href={`${baseUrl}/${locale}`}
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
          {isGreek ? "Επίσκεψη Οikion" : "Visit Oikion"}
        </Link>
      </Section>
    </BaseLayout>
  );
};

export default PropertyInquiryConfirmEmail;
