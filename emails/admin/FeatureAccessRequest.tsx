import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

interface FeatureAccessRequestEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  organizationId: string;
  feature: string;
  featureDisplayName: string;
  message: string;
  userTheme?: string;
}

export const FeatureAccessRequestEmail = ({
  userName = "John Doe",
  userEmail = "john@example.com",
  organizationName = "Acme Real Estate",
  organizationId = "org-123",
  feature = "ai_assistant",
  featureDisplayName = "AI Assistant",
  message = "We would like to test the AI Assistant feature for our agency.",
  userTheme,
}: FeatureAccessRequestEmailProps) => {
  const colors = resolveColors(userTheme);
  const previewText = `Feature Access Request: ${featureDisplayName} from ${organizationName}`;

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform."
      emailTheme={userTheme}
    >
      <EmailBadge
        icon=""
        text="Feature Access Request"
        colorClass="bg-violet-50 text-violet-700 border-violet-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {featureDisplayName} Access Request
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        An organization has requested access to a premium feature.
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Organization Details */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-4">
          Organization Details
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>Organization:</strong> {organizationName}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>Organization ID:</strong> {organizationId}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>Requested By:</strong> {userName}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
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
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-2">
          Reason for request:
        </Text>
        <Section
          style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-lg p-4 border-l-4"
        >
          <Text style={{ color: colors.textSecondary }} className="text-sm m-0 italic leading-relaxed">
            &ldquo;{message}&rdquo;
          </Text>
        </Section>
      </Section>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Instructions */}
      <Section className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <Text className="text-blue-800 text-sm font-semibold m-0 mb-2">
          How to Grant Access
        </Text>
        <Text className="text-blue-700 text-sm m-0 leading-relaxed">
          Go to Platform Admin → Organizations → Find &ldquo;{organizationName}&rdquo; →
          Features tab → Enable &ldquo;{featureDisplayName}&rdquo;.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default FeatureAccessRequestEmail;
