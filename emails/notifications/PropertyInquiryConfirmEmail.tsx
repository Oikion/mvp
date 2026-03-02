import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface PropertyInquiryConfirmEmailProps {
  inquirerName: string;
  agentName: string;
  inquiryId?: string;
  locale?: string;
}

export const PropertyInquiryConfirmEmail = ({
  inquirerName,
  agentName,
  inquiryId,
  locale = "en",
}: PropertyInquiryConfirmEmailProps) => {
  const isGreek = locale === "el";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

  const previewText = isGreek
    ? "Λάβαμε το αίτημά σας ανάθεσης"
    : "We received your property inquiry";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {isGreek ? "Επιβεβαίωση Αιτήματος Ανάθεσης" : "Inquiry Confirmed"}
          </Heading>

          <Text style={paragraph}>
            {isGreek ? `Γεια σου ${inquirerName},` : `Hi ${inquirerName},`}
          </Text>

          <Text style={paragraph}>
            {isGreek
              ? `Ευχαριστούμε που επικοινώνησες μαζί μας! Λάβαμε το αίτημά σου ανάθεσης και το στείλαμε στον/στην ${agentName}.`
              : `Thank you for reaching out! We've received your property inquiry and sent it to ${agentName}.`}
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              {isGreek
                ? `Ο/Η ${agentName} θα επικοινωνήσει μαζί σου σύντομα για να συζητήσετε τις ανάγκες σου.`
                : `${agentName} will get in touch with you soon to discuss your needs.`}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph}>
            {isGreek
              ? "Στο μεταξύ, μπορείς να:"
              : "In the meantime, you can:"}
          </Text>

          <Section style={list}>
            <Text style={listItem}>
              {isGreek
                ? "• Εξερεύνησε τα διαθέσιμα ακίνητα στην πλατφόρμα μας"
                : "• Explore available properties on our platform"}
            </Text>
            <Text style={listItem}>
              {isGreek
                ? "• Δημιούργησε λογαριασμό για να παρακολουθείς την πρόοδο του αιτήματός σου"
                : "• Create an account to track your inquiry progress"}
            </Text>
            <Text style={listItem}>
              {isGreek
                ? "• Συνδέσου με άλλους επαγγελματίες ακινήτων"
                : "• Connect with other real estate professionals"}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={ctaSection}>
            <Link
              href={`${baseUrl}/${locale}`}
              style={button}
            >
              {isGreek ? "Επίσκεψη Οikion" : "Visit Oikion"}
            </Link>
          </Section>

          <Text style={footer}>
            {isGreek
              ? "Αν δεν υπέβαλες αυτό το αίτημα, μπορείς να αγνοήσεις αυτό το email."
              : "If you didn't submit this inquiry, you can safely ignore this email."}
          </Text>

          {inquiryId && (
            <Text style={footerSmall}>
              Inquiry ID: {inquiryId}
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
};

export default PropertyInquiryConfirmEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 30px",
};

const paragraph = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const highlightBox = {
  backgroundColor: "#dbeafe",
  borderLeft: "4px solid #2563eb",
  borderRadius: "4px",
  padding: "16px 20px",
  margin: "24px 0",
};

const highlightText = {
  color: "#1e3a8a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
};

const list = {
  margin: "16px 0",
};

const listItem = {
  color: "#525252",
  fontSize: "15px",
  lineHeight: "28px",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
};

const footer = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "24px 0 8px",
};

const footerSmall = {
  color: "#94a3b8",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};
