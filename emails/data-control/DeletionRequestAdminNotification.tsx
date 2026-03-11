import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailDetailsCard,
  EmailDetailRow,
  EmailText,
  EmailCTAButton,
  EmailHighlightBox,
  BADGE_COLORS,
  baseUrl,
  resolveColors,
} from "../components/BaseLayout";

interface DeletionRequestAdminNotificationEmailProps {
  userEmail: string;
  userName?: string;
  organizationName: string;
  reason?: string;
  requestId: string;
  gracePeriodEndsAt: string;
  userTheme?: string;
}

export const DeletionRequestAdminNotificationEmail = ({
  userEmail,
  userName,
  organizationName,
  reason,
  requestId,
  gracePeriodEndsAt,
  userTheme,
}: DeletionRequestAdminNotificationEmailProps) => {
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
      previewText={`Data deletion request from ${userEmail}`}
      footerText="This is a platform admin notification from Oikion."
      emailTheme={userTheme}
    >
      <EmailHeader
        badge={{
          icon: "⚠️",
          text: "Action Required",
          colorClass: BADGE_COLORS.amber,
        }}
        title="New Data Deletion Request"
        subtitle="A user has requested deletion of their organization's data. Please review this request."
        colors={colors}
      />

      <EmailDetailsCard title="Request Details" colors={colors}>
        <EmailDetailRow label="Request ID" value={requestId} colors={colors} />
        <EmailDetailRow label="User" value={userName ? `${userName} (${userEmail})` : userEmail} colors={colors} />
        <EmailDetailRow label="Organization" value={organizationName} colors={colors} />
        <EmailDetailRow
          label="Grace Period Ends"
          value={gracePeriodDate}
          isLast
          colors={colors}
        />
      </EmailDetailsCard>

      {reason && (
        <EmailHighlightBox
          title="User's Reason"
          content={reason}
          colorClass="bg-amber-50 border-amber-400 text-amber-800"
        />
      )}

      <EmailText colors={colors}>
        Please review this request in the Platform Admin dashboard. You can
        approve or reject the request. If approved, the data will be eligible
        for permanent deletion after the grace period ends.
      </EmailText>

      <EmailCTAButton
        href={`${baseUrl}/en/app/platform-admin/data-requests`}
        text="Review Request"
        altLinkText="Or view at:"
        colors={colors}
      />
    </BaseLayout>
  );
};

export default DeletionRequestAdminNotificationEmail;
