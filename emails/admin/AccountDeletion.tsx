import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface AccountDeletionEmailProps {
  userName?: string;
  reason: string;
  deletionDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
  userTheme?: string;
}

export const AccountDeletionEmail = ({
  userName = "User",
  reason,
  deletionDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
  userTheme,
}: AccountDeletionEmailProps) => {
  const colors = resolveColors(userTheme);

  const previewText = isOrgWide
    ? `Your organization "${organizationName}" has been deleted`
    : "Your Oikion account has been deleted";

  const title = isOrgWide ? "Organization Deleted" : "Account Deleted";
  const targetText = isOrgWide
    ? `your organization "${organizationName}"`
    : "your Oikion account";

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform Administration. Please do not reply to this email."
      emailTheme={userTheme}
    >
      {/* Deletion Icon Header */}
      <Section className="text-center mb-4">
        <Text className="text-5xl m-0">❌</Text>
      </Section>

      <Heading className="text-red-600 text-2xl font-bold text-center p-0 my-5 mx-0">
        {title}
      </Heading>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Dear {userName},
      </Text>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        We are writing to inform you that {targetText} has been
        deleted by our platform administrators.
      </Text>

      {/* Deletion Reason Box */}
      <Section className="bg-red-50 border-l-4 border-solid border-red-600 rounded-r-md p-4 my-4">
        <Text className="text-red-800 text-sm leading-6 m-0 font-semibold">
          Reason for Deletion:
        </Text>
        <Text className="text-red-700 text-sm leading-6 m-0 mt-2">
          {reason}
        </Text>
      </Section>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
        <strong>What this means:</strong>
      </Text>
      <ul className="text-sm leading-6 pl-4" style={{ color: colors.textPrimary }}>
        {isOrgWide ? (
          <>
            <li>The organization &quot;{organizationName}&quot; has been permanently removed</li>
            <li>All organization data has been deleted from our servers</li>
            <li>You no longer have access to any data associated with this organization</li>
            <li>This action cannot be undone</li>
          </>
        ) : (
          <>
            <li>Your account has been permanently removed</li>
            <li>All your personal data has been deleted from our servers</li>
            <li>You can no longer access any data associated with your account</li>
            <li>This action cannot be undone</li>
          </>
        )}
      </ul>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 my-4">
        If you believe this action was taken in error, please contact our
        support team immediately. Note that while we may be able to
        investigate the decision, deleted data cannot be recovered.
      </Text>

      {/* Timestamp */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-3 my-4"
      >
        <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 m-0">
          <strong>Deletion Date:</strong>{" "}
          {new Date(deletionDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6 w-full" />
    </BaseLayout>
  );
};

export default AccountDeletionEmail;
