import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailGreeting,
  EmailText,
  EmailDetailsCard,
  EmailDetailRow,
  EmailCTAButton,
  BADGE_COLORS,
  baseUrl,
  resolveColors,
} from "../components/BaseLayout";

interface DeletionReminderEmailProps {
  userName: string;
  deletionDate: string; // ISO string
  requestId: string;
  canCancel: boolean;
  userTheme?: string;
}

export const DeletionReminderEmail = ({
  userName = "User",
  deletionDate,
  requestId,
  canCancel,
  userTheme,
}: DeletionReminderEmailProps) => {
  const colors = resolveColors(userTheme);

  const formattedDate = new Date(deletionDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <BaseLayout
      previewText="Reminder: Your data will be deleted in 3 days"
      footerText="This is an automated reminder from Oikion."
      footerNote={`Request ID: ${requestId}`}
      emailTheme={userTheme}
    >
      <EmailHeader
        badge={{
          icon: "⚠️",
          text: "Deletion Reminder",
          colorClass: BADGE_COLORS.amber,
        }}
        title="Data Deletion Reminder"
        subtitle="Your data deletion is scheduled"
        colors={colors}
      />
      <EmailGreeting name={userName} text="Hello {name}," colors={colors} />
      <EmailText colors={colors}>
        This is a reminder that your organization&apos;s data is scheduled to be
        permanently deleted in <strong>3 days</strong>.
      </EmailText>
      <EmailDetailsCard title="Deletion Details" colors={colors}>
        <EmailDetailRow label="Scheduled deletion date" value={formattedDate} colors={colors} />
        <EmailDetailRow label="Request ID" value={requestId} isLast colors={colors} />
      </EmailDetailsCard>
      {canCancel ? (
        <>
          <EmailText colors={colors}>
            If you have changed your mind, you can cancel this request from your
            profile settings before the deletion date.
          </EmailText>
          <EmailCTAButton
            href={`${baseUrl}/app/profile?tab=data-control`}
            text="Cancel Deletion Request"
            colors={colors}
          />
        </>
      ) : (
        <EmailText colors={colors}>
          This deletion has been approved and is scheduled to run automatically.
          Contact support if you believe this is an error.
        </EmailText>
      )}
    </BaseLayout>
  );
};

export default DeletionReminderEmail;
