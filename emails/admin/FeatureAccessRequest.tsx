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

interface FeatureAccessRequestEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  organizationId: string;
  feature: string;
  featureDisplayName: string;
  message: string;
}

export const FeatureAccessRequestEmail = ({
  userName = "John Doe",
  userEmail = "john@example.com",
  organizationName = "Acme Real Estate",
  organizationId = "org-123",
  feature = "ai_assistant",
  featureDisplayName = "AI Assistant",
  message = "We would like to test the AI Assistant feature for our agency.",
}: FeatureAccessRequestEmailProps) => {
  const previewText = `Feature Access Request: ${featureDisplayName} from ${organizationName}`;

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
                <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full border border-violet-200">
                  Feature Access Request
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {featureDisplayName} Access Request
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                An organization has requested access to a premium feature.
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Organization Details */}
              <Section className="bg-zinc-50 rounded-lg p-5 mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-4">
                  Organization Details
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Organization:</strong> {organizationName}
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Organization ID:</strong> {organizationId}
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Requested By:</strong> {userName}
                </Text>
                <Text className="text-zinc-700 text-sm m-0 mb-2">
                  <strong>Email:</strong> {userEmail}
                </Text>
              </Section>

              {/* Feature Details */}
              <Section className="bg-violet-50 rounded-lg p-5 mb-6 border border-violet-100">
                <Text className="text-violet-900 text-sm font-semibold m-0 mb-2">
                  Requested Feature
                </Text>
                <Text className="text-violet-700 text-lg font-semibold m-0">
                  {featureDisplayName}
                </Text>
                <Text className="text-violet-600 text-xs m-0 mt-1">
                  Feature key: {feature}
                </Text>
              </Section>

              {/* Message */}
              <Section className="mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-2">
                  Reason for request:
                </Text>
                <Section className="bg-zinc-50 rounded-lg p-4 border-l-4 border-zinc-300">
                  <Text className="text-zinc-700 text-sm m-0 italic leading-relaxed">
                    "{message}"
                  </Text>
                </Section>
              </Section>

              <Hr className="border-zinc-200 my-6" />

              {/* Instructions */}
              <Section className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <Text className="text-blue-800 text-sm font-semibold m-0 mb-2">
                  How to Grant Access
                </Text>
                <Text className="text-blue-700 text-sm m-0 leading-relaxed">
                  Go to Platform Admin → Organizations → Find "{organizationName}" → 
                  Features tab → Enable "{featureDisplayName}".
                </Text>
              </Section>
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

export default FeatureAccessRequestEmail;
