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

interface AgentContactFormSubmissionProps {
  agentName: string;
  senderName: string;
  senderEmail: string;
  formData: Record<string, any>;
  submissionId: string;
  locale?: string;
}

export const AgentContactFormSubmission = ({
  agentName,
  senderName,
  senderEmail,
  formData,
  submissionId,
  locale = "en",
}: AgentContactFormSubmissionProps) => {
  const isGreek = locale === "el";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

  const previewText = isGreek
    ? `Νέο μήνυμα από ${senderName}`
    : `New message from ${senderName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {isGreek ? "Νέο Μήνυμα Επικοινωνίας" : "New Contact Form Message"}
          </Heading>

          <Text style={paragraph}>
            {isGreek ? `Γεια σου ${agentName},` : `Hi ${agentName},`}
          </Text>

          <Text style={paragraph}>
            {isGreek
              ? `Λάβατε νέο μήνυμα μέσω της φόρμας επικοινωνίας στο προφίλ σας.`
              : `You received a new message through the contact form on your profile.`}
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>
              {isGreek ? "Αποστολέας:" : "From:"}
            </Text>
            <Text style={infoValue}>{senderName}</Text>

            <Text style={infoLabel}>
              {isGreek ? "Email:" : "Email:"}
            </Text>
            <Text style={infoValue}>
              <Link href={`mailto:${senderEmail}`} style={link}>
                {senderEmail}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={messageSection}>
            <Text style={sectionTitle}>
              {isGreek ? "Λεπτομέρειες Μηνύματος:" : "Message Details:"}
            </Text>
            {Object.entries(formData).map(([key, value]) => {
              // Skip internal fields
              if (key === "privacyConsent") return null;
              
              // Format the key for display
              const formattedKey = key
                .replace(/_/g, " ")
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .trim();

              return (
                <div key={key} style={fieldRow}>
                  <Text style={fieldLabel}>{formattedKey}:</Text>
                  <Text style={fieldValue}>
                    {typeof value === "boolean"
                      ? value
                        ? isGreek
                          ? "Ναι"
                          : "Yes"
                        : isGreek
                        ? "Όχι"
                        : "No"
                      : String(value || "-")}
                  </Text>
                </div>
              );
            })}
          </Section>

          <Hr style={hr} />

          <Section style={ctaSection}>
            <Link
              href={`${baseUrl}/app/crm/form-submissions`}
              style={button}
            >
              {isGreek ? "Προβολή Υποβολών" : "View Submissions"}
            </Link>
          </Section>

          <Text style={footer}>
            {isGreek
              ? "Αυτό το email στάλθηκε αυτόματα από το Oikion. Μπορείτε να απαντήσετε απευθείας στον αποστολέα."
              : "This email was sent automatically from Oikion. You can reply directly to the sender."}
          </Text>

          <Text style={footerSmall}>
            Submission ID: {submissionId}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AgentContactFormSubmission;

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

const infoBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "0 0 4px",
};

const infoValue = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 16px",
};

const link = {
  color: "#2563eb",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const messageSection = {
  margin: "24px 0",
};

const sectionTitle = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const fieldRow = {
  marginBottom: "12px",
};

const fieldLabel = {
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const fieldValue = {
  color: "#1a1a1a",
  fontSize: "15px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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
