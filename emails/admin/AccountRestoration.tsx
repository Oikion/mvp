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

interface AccountRestorationEmailProps {
  userName?: string;
  restorationDate: string;
}

export const AccountRestorationEmail = ({
  userName = "User",
  restorationDate,
}: AccountRestorationEmailProps) => {
  const previewText = "Good news! Your Oikion account has been restored";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[600px]">
            {/* Success Icon Header */}
            <Section className="text-center mb-4">
              <Text className="text-[48px] m-0">✅</Text>
            </Section>

            <Heading className="text-green-600 text-[24px] font-bold text-center p-0 my-[20px] mx-0">
              Account Restored
            </Heading>

            <Text className="text-black text-[14px] leading-[24px]">
              Dear {userName},
            </Text>

            <Text className="text-black text-[14px] leading-[24px]">
              Good news! Your Oikion account has been restored and you can now
              access the platform again.
            </Text>

            {/* Success Message Box */}
            <Section className="bg-green-50 border-l-4 border-solid border-green-500 rounded-r-md p-4 my-4">
              <Text className="text-green-800 text-[14px] leading-[24px] m-0 font-semibold">
                Your Access Has Been Restored
              </Text>
              <Text className="text-green-700 text-[14px] leading-[24px] m-0 mt-2">
                You can now log in to your account and resume using all platform
                features.
              </Text>
            </Section>

            <Text className="text-black text-[14px] leading-[24px]">
              <strong>What you can do now:</strong>
            </Text>
            <ul className="text-black text-[14px] leading-[24px] pl-4">
              <li>Log in to your account</li>
              <li>Access all your data and settings</li>
              <li>Resume using the platform normally</li>
            </ul>

            <Text className="text-black text-[14px] leading-[24px]">
              If you have any questions or need assistance, please don&apos;t
              hesitate to contact our support team.
            </Text>

            {/* Timestamp */}
            <Section className="bg-slate-50 rounded-md p-3 my-4">
              <Text className="text-slate-600 text-[12px] leading-[20px] m-0">
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

export default AccountRestorationEmail;
