import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailDetailsCard,
  EmailDetailRow,
  EmailGreeting,
  EmailText,
  BADGE_COLORS,
  resolveColors,
} from "../components/BaseLayout";

interface DeletionRequestConfirmationEmailProps {
  userName: string;
  requestId: string;
  gracePeriodEndsAt: string;
  userTheme?: string;
}

export const DeletionRequestConfirmationEmail = ({
  userName = "User",
  requestId,
  gracePeriodEndsAt,
  userTheme,
}: DeletionRequestConfirmationEmailProps) => {
  const colors = resolveColors(userTheme);

  const gracePeriodDate = new Date(gracePeriodEndsAt).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <BaseLayout
      previewText="Your data deletion request has been received"
      footerText="This is an automated notification from Oikion."
      footerNote="If you didn't request this, please contact support immediately."
      emailTheme={userTheme}
    >
      <EmailHeader
        badge={{
          icon: "🗑️",
          text: "Data Deletion Request",
          colorClass: BADGE_COLORS.red,
        }}
        title="Deletion Request Received"
        subtitle="We have received your request to delete your organization's data."
        colors={colors}
      />

      <EmailGreeting name={userName} text="Hello {name}," colors={colors} />

      <EmailText colors={colors}>
        Your data deletion request has been submitted and is now under review.
        There is a <strong>30-day grace period</strong> during which you can
        cancel this request at any time from your account settings.
      </EmailText>

      <EmailDetailsCard title="Request Details" colors={colors}>
        <EmailDetailRow label="Request ID" value={requestId} colors={colors} />
        <EmailDetailRow
          label="Grace Period Ends"
          value={gracePeriodDate}
          isLast
          colors={colors}
        />
      </EmailDetailsCard>

      <EmailText colors={colors}>
        After the grace period ends and admin approval, all your
        organization&apos;s data will be permanently deleted. This includes
        clients, properties, documents, messages, and all other records.
      </EmailText>

      <EmailText colors={colors}>
        To cancel this request, go to your <strong>Account Settings</strong> and
        navigate to the <strong>Data Control</strong> tab.
      </EmailText>
    </BaseLayout>
  );
};

export default DeletionRequestConfirmationEmail;
