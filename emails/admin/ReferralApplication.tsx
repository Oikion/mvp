import {
  Button,
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

interface ReferralApplicationEmailProps {
  applicantName: string;
  applicantEmail: string;
  message: string;
  userId: string;
  approveUrl: string;
  denyUrl: string;
  userTheme?: string;
}

export const ReferralApplicationEmail = ({
  applicantName = "John Doe",
  applicantEmail = "john@example.com",
  message = "I would like to join the referral programme because I have a large network of real estate professionals.",
  userId = "user-123",
  approveUrl = "https://oikion.com/api/referral/approve/token",
  denyUrl = "https://oikion.com/api/referral/deny/token",
  userTheme,
}: ReferralApplicationEmailProps) => {
  const colors = resolveColors(userTheme);
  const previewText = `New Referral Programme Application from ${applicantName}`;

  return (
    <BaseLayout
      previewText={previewText}
      footerText="This is an automated message from Oikion Platform."
      emailTheme={userTheme}
    >
      <EmailBadge
        icon=""
        text="New Application"
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        Referral Programme Application
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        A new user has applied to join the referral programme.
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Applicant Details */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-4">
          Applicant Details
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>Name:</strong> {applicantName}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>Email:</strong> {applicantEmail}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          <strong>User ID:</strong> {userId}
        </Text>
      </Section>

      {/* Message */}
      <Section className="mb-6">
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-2">
          Why they want to join:
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

      {/* Action Buttons */}
      <Text style={{ color: colors.textSecondary }} className="text-sm text-center m-0 mb-4">
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

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mt-4">
        These links will expire in 7 days.
      </Text>
    </BaseLayout>
  );
};

export default ReferralApplicationEmail;
