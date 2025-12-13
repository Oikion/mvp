import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface AccountWarningEmailProps {
  userName?: string;
  reason: string;
  warningDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
}

export const AccountWarningEmail = ({
  userName = "User",
  reason,
  warningDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
}: AccountWarningEmailProps) => {
  const previewText = isOrgWide 
    ? `Important: Your organization "${organizationName}" has received a warning`
    : "Important: Your Oikion account has received a warning";

  const title = isOrgWide ? "Organization Warning" : "Account Warning";
  const targetText = isOrgWide 
    ? `Your organization "${organizationName}"` 
    : "Your Oikion account";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[600px]">
            {/* Warning Icon Header */}
            <Section className="text-center mb-4">
              <Text className="text-[48px] m-0">⚠️</Text>
            </Section>

            <Heading className="text-amber-600 text-[24px] font-bold text-center p-0 my-[20px] mx-0">
              {title}
            </Heading>

            <Text className="text-black text-[14px] leading-[24px]">
              Dear {userName},
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              {targetText} has received a warning from our platform
              administrators. Please review the details below:
            </Text>

            {/* Warning Reason Box */}
            <Section className="bg-amber-50 border-l-4 border-solid border-amber-500 rounded-r-md p-4 my-4">
              <Text className="text-amber-800 text-[14px] leading-[24px] m-0 font-semibold">
                Warning Reason:
              </Text>
              <Text className="text-amber-700 text-[14px] leading-[24px] m-0 mt-2">
                {reason}
              </Text>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              Please review our{" "}
              <strong>Terms of Service</strong> and ensure your {isOrgWide ? "organization's" : "account"} activity
              complies with our policies to avoid further action.
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              If you believe this warning was issued in error, please contact
              our support team.
            </Text>

            {/* Timestamp */}
            <Section className="bg-slate-50 rounded-md p-3 my-4">
              <Text className="text-slate-600 text-[12px] leading-[20px] m-0">
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

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />

            <Text className="text-slate-500 text-[12px] leading-[24px] text-center">
              This is an automated message from Oikion Platform Administration.
              Please do not reply to this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AccountWarningEmail;
