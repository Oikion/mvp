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
}

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
}: PropertyInquiryAgentEmailProps) => {
  const isGreek = locale === "el";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

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
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {isGreek ? "Νέο Αίτημα Ανάθεσης" : "New Property Inquiry"}
          </Heading>

          <Text style={paragraph}>
            {isGreek ? `Γεια σου ${agentName},` : `Hi ${agentName},`}
          </Text>

          <Text style={paragraph}>
            {isGreek
              ? `Λάβατε νέο αίτημα ανάθεσης από πιθανό πελάτη. Παρακάτω είναι οι λεπτομέρειες:`
              : `You received a new property inquiry from a potential client. Here are the details:`}
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>
              {isGreek ? "Επικοινωνία:" : "Contact:"}
            </Text>
            <Text style={infoValue}>{inquirerName}</Text>
            <Text style={infoValue}>
              <Link href={`mailto:${inquirerEmail}`} style={link}>
                {inquirerEmail}
              </Link>
            </Text>
            {inquirerPhone && inquirerPhone !== "Not provided" && (
              <Text style={infoValue}>
                <Link href={`tel:${inquirerPhone}`} style={link}>
                  {inquirerPhone}
                </Link>
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={messageSection}>
            <Text style={sectionTitle}>
              {isGreek ? "Λεπτομέρειες Ακινήτου:" : "Property Details:"}
            </Text>

            <div style={fieldRow}>
              <Text style={fieldLabel}>
                {isGreek ? "Τύπος Ακινήτου:" : "Property Type:"}
              </Text>
              <Text style={fieldValue}>{formatPropertyType(propertyType)}</Text>
            </div>

            <div style={fieldRow}>
              <Text style={fieldLabel}>
                {isGreek ? "Περιοχή:" : "Location:"}
              </Text>
              <Text style={fieldValue}>{location}</Text>
            </div>

            {budget && (
              <div style={fieldRow}>
                <Text style={fieldLabel}>
                  {isGreek ? "Προϋπολογισμός:" : "Budget:"}
                </Text>
                <Text style={fieldValue}>{budget}</Text>
              </div>
            )}

            {bedrooms && (
              <div style={fieldRow}>
                <Text style={fieldLabel}>
                  {isGreek ? "Υπνοδωμάτια:" : "Bedrooms:"}
                </Text>
                <Text style={fieldValue}>{bedrooms}</Text>
              </div>
            )}

            <div style={fieldRow}>
              <Text style={fieldLabel}>
                {isGreek ? "Χρονοδιάγραμμα:" : "Timeline:"}
              </Text>
              <Text style={fieldValue}>{formatTimeline(timeline)}</Text>
            </div>

            {message && (
              <>
                <Hr style={hr} />
                <div style={fieldRow}>
                  <Text style={fieldLabel}>
                    {isGreek ? "Μήνυμα:" : "Message:"}
                  </Text>
                  <Text style={fieldValue}>{message}</Text>
                </div>
              </>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={ctaSection}>
            <Link
              href={`${baseUrl}/app/assignments`}
              style={button}
            >
              {isGreek ? "Προβολή Αιτημάτων" : "View Assignments"}
            </Link>
          </Section>

          <Text style={footer}>
            {isGreek
              ? "Μπορείτε να απαντήσετε απευθείας στο email του ενδιαφερομένου ή να διαχειριστείτε το αίτημα στο Oikion."
              : "You can reply directly to the inquirer's email or manage this inquiry in Oikion."}
          </Text>

          <Text style={footerSmall}>
            Inquiry ID: {inquiryId}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PropertyInquiryAgentEmail;

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
