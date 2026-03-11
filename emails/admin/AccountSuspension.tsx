import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface AccountSuspensionEmailProps {
  userName?: string;
  reason: string;
  suspensionDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
  userTheme?: string;
}

export const AccountSuspensionEmail = ({
  userName = "User",
  reason,
  suspensionDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
  userTheme,
}: AccountSuspensionEmailProps) => {
  const colors = resolveColors(userTheme);

  const previewText = isOrgWide
    ? `Your organization "${organizationName}" has been suspended`
    : "Your Oikion account has been suspended";

  const title = isOrgWide ? "Organization Suspended" : "Account Suspended";
  const targetText = isOrgWide
    ? `Your organization "${organizationName}"`
    : "Your Oikion account";

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform Administration. Please do not reply to this email."
      emailTheme={userTheme}
    >
      {/* Suspension Icon Header */}
      <Section className="text-center mb-4">
        <Text className="text-5xl m-0">🚫</Text>
      </Section>

      <Heading className="text-red-600 text-2xl font-bold text-center p-0 my-5 mx-0">
        {title}
      </Heading>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Dear {userName},
      </Text>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        {targetText} has been suspended by our platform administrators. Your
        access to the platform has been restricted.
      </Text>

      {/* Suspension Reason Box */}
      <Section className="bg-red-50 border-l-4 border-solid border-red-500 rounded-r-md p-4 my-4">
        <Text className="text-red-800 text-sm leading-6 m-0 font-semibold">
          Reason for Suspension:
        </Text>
        <Text className="text-red-700 text-sm leading-6 m-0 mt-2">
          {reason}
        </Text>
      </Section>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
        <strong>What this means:</strong>
      </Text>
      <ul className="text-sm leading-6 pl-4" style={{ color: colors.textPrimary }}>
        <li>You cannot log in to your account</li>
        <li>Your data remains stored but inaccessible</li>
        <li>You will not receive notifications from the platform</li>
        {isOrgWide && <li>All members of {organizationName} are affected</li>}
      </ul>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 my-4">
        If you believe this action was taken in error, please contact our
        support team to appeal this decision.
      </Text>

      {/* Timestamp */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-3 my-4"
      >
        <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 m-0">
          <strong>Suspension Date:</strong>{" "}
          {new Date(suspensionDate).toLocaleDateString("en-US", {
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

export default AccountSuspensionEmail;
