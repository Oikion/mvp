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

interface AccountSuspensionEmailProps {
  userName?: string;
  reason: string;
  suspensionDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
}

export const AccountSuspensionEmail = ({
  userName = "User",
  reason,
  suspensionDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
}: AccountSuspensionEmailProps) => {
  const previewText = isOrgWide 
    ? `Your organization "${organizationName}" has been suspended`
    : "Your Oikion account has been suspended";

  const title = isOrgWide ? "Organization Suspended" : "Account Suspended";
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
            {/* Suspension Icon Header */}
            <Section className="text-center mb-4">
              <Text className="text-[48px] m-0">🚫</Text>
            </Section>

            <Heading className="text-red-600 text-[24px] font-bold text-center p-0 my-[20px] mx-0">
              {title}
            </Heading>

            <Text className="text-black text-[14px] leading-[24px]">
              Dear {userName},
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              {targetText} has been suspended by our platform
              administrators. Your access to the platform has been restricted.
            </Text>

            {/* Suspension Reason Box */}
            <Section className="bg-red-50 border-l-4 border-solid border-red-500 rounded-r-md p-4 my-4">
              <Text className="text-red-800 text-[14px] leading-[24px] m-0 font-semibold">
                Reason for Suspension:
              </Text>
              <Text className="text-red-700 text-[14px] leading-[24px] m-0 mt-2">
                {reason}
              </Text>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              <strong>What this means:</strong>
            </Text>
            <ul className="text-black text-[14px] leading-[24px] pl-4">
              <li>You cannot log in to your account</li>
              <li>Your data remains stored but inaccessible</li>
              <li>You will not receive notifications from the platform</li>
              {isOrgWide && <li>All members of {organizationName} are affected</li>}
            </ul>

            <Text className="text-black text-[14px] leading-[24px]">
              If you believe this action was taken in error, please contact our
              support team to appeal this decision.
            </Text>

            {/* Timestamp */}
            <Section className="bg-slate-50 rounded-md p-3 my-4">
              <Text className="text-slate-600 text-[12px] leading-[20px] m-0">
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

export default AccountSuspensionEmail;
