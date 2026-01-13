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

interface AccountDeletionEmailProps {
  userName?: string;
  reason: string;
  deletionDate?: string;
  isOrgWide?: boolean;
  organizationName?: string;
}

export const AccountDeletionEmail = ({
  userName = "User",
  reason,
  deletionDate = new Date().toISOString(),
  isOrgWide = false,
  organizationName,
}: AccountDeletionEmailProps) => {
  const previewText = isOrgWide 
    ? `Your organization "${organizationName}" has been deleted`
    : "Your Oikion account has been deleted";

  const title = isOrgWide ? "Organization Deleted" : "Account Deleted";
  const targetText = isOrgWide 
    ? `your organization "${organizationName}"` 
    : "your Oikion account";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[600px]">
            {/* Deletion Icon Header */}
            <Section className="text-center mb-4">
              <Text className="text-[48px] m-0">❌</Text>
            </Section>

            <Heading className="text-red-600 text-[24px] font-bold text-center p-0 my-[20px] mx-0">
              {title}
            </Heading>

            <Text className="text-black text-[14px] leading-[24px]">
              Dear {userName},
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              We are writing to inform you that {targetText} has been
              deleted by our platform administrators.
            </Text>

            {/* Deletion Reason Box */}
            <Section className="bg-red-50 border-l-4 border-solid border-red-600 rounded-r-md p-4 my-4">
              <Text className="text-red-800 text-[14px] leading-[24px] m-0 font-semibold">
                Reason for Deletion:
              </Text>
              <Text className="text-red-700 text-[14px] leading-[24px] m-0 mt-2">
                {reason}
              </Text>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              <strong>What this means:</strong>
            </Text>
            <ul className="text-black text-[14px] leading-[24px] pl-4">
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

            <Text className="text-black text-[14px] leading-[24px]">
              If you believe this action was taken in error, please contact our
              support team immediately. Note that while we may be able to
              investigate the decision, deleted data cannot be recovered.
            </Text>

            {/* Timestamp */}
            <Section className="bg-slate-50 rounded-md p-3 my-4">
              <Text className="text-slate-600 text-[12px] leading-[20px] m-0">
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

export default AccountDeletionEmail;








