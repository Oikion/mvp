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
} from "../components/BaseLayout";

interface DeletionRequestAdminNotificationEmailProps {
  userEmail: string;
  userName?: string;
  organizationName: string;
  reason?: string;
  requestId: string;
  gracePeriodEndsAt: string;
}

export const DeletionRequestAdminNotificationEmail = ({
  userEmail,
  userName,
  organizationName,
  reason,
  requestId,
  gracePeriodEndsAt,
}: DeletionRequestAdminNotificationEmailProps) => {
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
    >
      <EmailHeader
        badge={{
          icon: "⚠️",
          text: "Action Required",
          colorClass: BADGE_COLORS.amber,
        }}
        title="New Data Deletion Request"
        subtitle="A user has requested deletion of their organization's data. Please review this request."
      />

      <EmailDetailsCard title="Request Details">
        <EmailDetailRow label="Request ID" value={requestId} />
        <EmailDetailRow label="User" value={userName ? `${userName} (${userEmail})` : userEmail} />
        <EmailDetailRow label="Organization" value={organizationName} />
        <EmailDetailRow
          label="Grace Period Ends"
          value={gracePeriodDate}
          isLast
        />
      </EmailDetailsCard>

      {reason && (
        <EmailHighlightBox
          title="User's Reason"
          content={reason}
          colorClass="bg-amber-50 border-amber-400 text-amber-800"
        />
      )}

      <EmailText>
        Please review this request in the Platform Admin dashboard. You can
        approve or reject the request. If approved, the data will be eligible
        for permanent deletion after the grace period ends.
      </EmailText>

      <EmailCTAButton
        href={`${baseUrl}/en/app/platform-admin/data-requests`}
        text="Review Request"
        altLinkText="Or view at:"
      />
    </BaseLayout>
  );
};

export default DeletionRequestAdminNotificationEmail;
