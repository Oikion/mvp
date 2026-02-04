import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface ReferralApplicationEmailProps {
  applicantName: string;
  applicantEmail: string;
  message: string;
  userId: string;
  approveUrl: string;
  denyUrl: string;
}

export const ReferralApplicationEmail = ({
  applicantName = "John Doe",
  applicantEmail = "john@example.com",
  message = "I would like to join the referral programme because I have a large network of real estate professionals.",
  userId = "user-123",
  approveUrl = "https://oikion.com/api/referral/approve/token",
  denyUrl = "https://oikion.com/api/referral/deny/token",
}: ReferralApplicationEmailProps) => {
  const previewText = `New Referral Programme Application from ${applicantName}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                  New Application
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                Referral Programme Application
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                A new user has applied to join the referral programme.
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Applicant Details */}
              <Section className="bg-zinc-50 rounded-lg p-5 mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-4">
                  Applicant Details
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Name:</strong> {applicantName}
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Email:</strong> {applicantEmail}
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>User ID:</strong> {userId}
                </Text>
              </Section>

              {/* Message */}
              <Section className="mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-2">
                  Why they want to join:
                </Text>
                <Section className="bg-zinc-50 rounded-lg p-4 border-l-4 border-zinc-300">
                  <Text className="text-zinc-700 text-sm m-0 italic leading-relaxed">
                    "{message}"
                  </Text>
                </Section>
              </Section>

              <Hr className="border-zinc-200 my-6" />

              {/* Action Buttons */}
              <Text className="text-zinc-600 text-sm text-center m-0 mb-4">
                Take action on this application:
              </Text>

              <Section className="text-center">
                <Row>
                  <Column align="center" className="px-2">
                    <Button
                      className="bg-emerald-600 rounded-lg text-white py-3 px-6 text-sm font-semibold no-underline text-center inline-block"
                      href={approveUrl}
                    >
                      Approve
                    </Button>
                  </Column>
                  <Column align="center" className="px-2">
                    <Button
                      className="bg-red-600 rounded-lg text-white py-3 px-6 text-sm font-semibold no-underline text-center inline-block"
                      href={denyUrl}
                    >
                      Deny
                    </Button>
                  </Column>
                </Row>
              </Section>

              <Text className="text-zinc-400 text-xs text-center m-0 mt-4">
                These links will expire in 7 days.
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                This is an automated message from Oikion Platform.
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReferralApplicationEmail;
