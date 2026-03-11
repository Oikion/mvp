import {
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface AgentContactFormSubmissionProps {
  agentName: string;
  senderName: string;
  senderEmail: string;
  formData: Record<string, any>;
  submissionId: string;
  locale?: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const AgentContactFormSubmission = ({
  agentName,
  senderName,
  senderEmail,
  formData,
  submissionId,
  locale = "en",
  userTheme,
}: AgentContactFormSubmissionProps) => {
  const colors = resolveColors(userTheme);
  const isGreek = locale === "el";

  const previewText = isGreek
    ? `Νέο μήνυμα από ${senderName}`
    : `New message from ${senderName}`;

  return (
    <BaseLayout
      previewText={previewText}
      footerText={
        isGreek
          ? "Αυτό το email στάλθηκε αυτόματα από το Oikion. Μπορείτε να απαντήσετε απευθείας στον αποστολέα."
          : "This email was sent automatically from Oikion. You can reply directly to the sender."
      }
      footerNote={`Submission ID: ${submissionId}`}
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-6"
      >
        {isGreek ? "Νέο Μήνυμα Επικοινωνίας" : "New Contact Form Message"}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {isGreek ? `Γεια σου ${agentName},` : `Hi ${agentName},`}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {isGreek
          ? "Λάβατε νέο μήνυμα μέσω της φόρμας επικοινωνίας στο προφίλ σας."
          : "You received a new message through the contact form on your profile."}
      </Text>

      {/* Sender info */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase m-0 mb-1">
          {isGreek ? "Αποστολέας:" : "From:"}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0 mb-4">
          {senderName}
        </Text>
        <Text style={{ color: colors.textMuted }} className="text-xs font-semibold uppercase m-0 mb-1">
          {isGreek ? "Email:" : "Email:"}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-base font-medium m-0">
          <Link href={`mailto:${senderEmail}`} style={{ color: colors.linkColor }}>
            {senderEmail}
          </Link>
        </Text>
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Message Details */}
      <Section className="mb-6">
        <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0 mb-4">
          {isGreek ? "Λεπτομέρειες Μηνύματος:" : "Message Details:"}
        </Text>
        {Object.entries(formData).map(([key, value]) => {
          if (key === "privacyConsent") return null;

          const formattedKey = key
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          return (
            <div key={key} style={{ marginBottom: "12px" }}>
              <Text style={{ color: colors.textMuted }} className="text-sm font-medium m-0 mb-1">
                {formattedKey}:
              </Text>
              <Text style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" as const }} className="text-sm m-0">
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

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* CTA */}
      <Section className="text-center my-8">
        <Link
          href={`${baseUrl}/app/crm/form-submissions`}
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
          {isGreek ? "Προβολή Υποβολών" : "View Submissions"}
        </Link>
      </Section>
    </BaseLayout>
  );
};

export default AgentContactFormSubmission;
