import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface AccountWarningEmailProps {
  userName?: string;
  reason: string;
  warningDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
  userTheme?: string;
}

export const AccountWarningEmail = ({
  userName = "User",
  reason,
  warningDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
  userTheme,
}: AccountWarningEmailProps) => {
  const colors = resolveColors(userTheme);

  const previewText = isOrgWide
    ? `Important: Your organization "${organizationName}" has received a warning`
    : "Important: Your Oikion account has received a warning";

  const title = isOrgWide ? "Organization Warning" : "Account Warning";
  const targetText = isOrgWide
    ? `Your organization "${organizationName}"`
    : "Your Oikion account";

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform Administration. Please do not reply to this email."
      emailTheme={userTheme}
    >
      {/* Warning Icon Header */}
      <Section className="text-center mb-4">
        <Text className="text-5xl m-0">⚠️</Text>
      </Section>

      <Heading className="text-amber-600 text-2xl font-bold text-center p-0 my-5 mx-0">
        {title}
      </Heading>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Dear {userName},
      </Text>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        {targetText} has received a warning from our platform administrators.
        Please review the details below:
      </Text>

      {/* Warning Reason Box */}
      <Section className="bg-amber-50 border-l-4 border-solid border-amber-500 rounded-r-md p-4 my-4">
        <Text className="text-amber-800 text-sm leading-6 m-0 font-semibold">
          Warning Reason:
        </Text>
        <Text className="text-amber-700 text-sm leading-6 m-0 mt-2">
          {reason}
        </Text>
      </Section>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Please review our{" "}
        <strong>Terms of Service</strong> and ensure your{" "}
        {isOrgWide ? "organization's" : "account"} activity complies with our
        policies to avoid further action.
      </Text>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 my-4">
        If you believe this warning was issued in error, please contact our
        support team.
      </Text>

      {/* Timestamp */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-3 my-4"
      >
        <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 m-0">
          <strong>Warning Date:</strong>{" "}
          {new Date(warningDate).toLocaleDateString("en-US", {
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

export default AccountWarningEmail;
