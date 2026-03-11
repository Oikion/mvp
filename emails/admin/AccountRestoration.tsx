import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "../components/BaseLayout";

interface AccountRestorationEmailProps {
  userName?: string;
  restorationDate: string;
  userTheme?: string;
}

export const AccountRestorationEmail = ({
  userName = "User",
  restorationDate,
  userTheme,
}: AccountRestorationEmailProps) => {
  const colors = resolveColors(userTheme);
  const previewText = "Good news! Your Oikion account has been restored";

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform Administration. Please do not reply to this email."
      emailTheme={userTheme}
    >
      {/* Success Icon Header */}
      <Section className="text-center mb-4">
        <Text className="text-5xl m-0">✅</Text>
      </Section>

      <Heading className="text-green-600 text-2xl font-bold text-center p-0 my-5 mx-0">
        Account Restored
      </Heading>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Dear {userName},
      </Text>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-4">
        Good news! Your Oikion account has been restored and you can now
        access the platform again.
      </Text>

      {/* Success Message Box */}
      <Section className="bg-green-50 border-l-4 border-solid border-green-500 rounded-r-md p-4 my-4">
        <Text className="text-green-800 text-sm leading-6 m-0 font-semibold">
          Your Access Has Been Restored
        </Text>
        <Text className="text-green-700 text-sm leading-6 m-0 mt-2">
          You can now log in to your account and resume using all platform
          features.
        </Text>
      </Section>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
        <strong>What you can do now:</strong>
      </Text>
      <ul className="text-sm leading-6 pl-4" style={{ color: colors.textPrimary }}>
        <li>Log in to your account</li>
        <li>Access all your data and settings</li>
        <li>Resume using the platform normally</li>
      </ul>

      <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 my-4">
        If you have any questions or need assistance, please don&apos;t
        hesitate to contact our support team.
      </Text>

      {/* Timestamp */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-3 my-4"
      >
        <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 m-0">
          <strong>Restoration Date:</strong>{" "}
          {new Date(restorationDate).toLocaleDateString("en-US", {
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

export default AccountRestorationEmail;
