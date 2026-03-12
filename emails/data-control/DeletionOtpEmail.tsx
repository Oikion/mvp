import * as React from "react";
import { Section, Text } from "@react-email/components";
import {
  BaseLayout,
  EmailHeader,
  EmailGreeting,
  EmailText,
  BADGE_COLORS,
  resolveColors,
} from "../components/BaseLayout";

interface DeletionOtpEmailProps {
  userName: string;
  otpCode: string;
  expiresInMinutes: number;
  userTheme?: string;
}

export const DeletionOtpEmail = ({
  userName = "User",
  otpCode,
  expiresInMinutes = 15,
  userTheme,
}: DeletionOtpEmailProps) => {
  const colors = resolveColors(userTheme);

  return (
    <BaseLayout
      previewText={`Your data deletion confirmation code: ${otpCode}`}
      footerText="This is an automated security notification from Oikion."
      footerNote="If you didn't request this, you can safely ignore this email. No action will be taken without this code."
      emailTheme={userTheme}
    >
      <EmailHeader
        badge={{
          icon: "🔐",
          text: "Security Code",
          colorClass: BADGE_COLORS.red,
        }}
        title="Confirm Data Deletion"
        subtitle="Enter this code to confirm your request"
        colors={colors}
      />
      <EmailGreeting name={userName} text="Hello {name}," colors={colors} />
      <EmailText colors={colors}>
        You requested to delete your organization&apos;s data. Enter the code
        below in the app to confirm. This code expires in {expiresInMinutes}{" "}
        minutes.
      </EmailText>
      {/* OTP display — red is a semantic security color, kept as hardcoded hex */}
      <Section
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        <Text
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            letterSpacing: "8px",
            textAlign: "center",
            fontFamily: "monospace",
            color: "#dc2626",
            margin: "0",
          }}
        >
          {otpCode}
        </Text>
      </Section>
      <EmailText colors={colors}>
        If you did not request this, please contact support immediately. Your
        data will not be deleted unless you enter this code.
      </EmailText>
    </BaseLayout>
  );
};

export default DeletionOtpEmail;
