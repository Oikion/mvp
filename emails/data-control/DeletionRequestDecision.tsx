import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailDetailsCard,
  EmailDetailRow,
  EmailGreeting,
  EmailText,
  EmailHighlightBox,
  BADGE_COLORS,
} from "../components/BaseLayout";

interface DeletionRequestDecisionEmailProps {
  userName: string;
  requestId: string;
  decision: "approved" | "rejected";
  adminNote?: string;
  gracePeriodEndsAt?: string;
}

export const DeletionRequestDecisionEmail = ({
  userName = "User",
  requestId,
  decision,
  adminNote,
  gracePeriodEndsAt,
}: DeletionRequestDecisionEmailProps) => {
  const isApproved = decision === "approved";

  const gracePeriodDate = gracePeriodEndsAt
    ? new Date(gracePeriodEndsAt).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined;

  return (
    <BaseLayout
      previewText={`Your data deletion request has been ${decision}`}
      footerText="This is an automated notification from Oikion."
    >
      <EmailHeader
        badge={{
          icon: isApproved ? "✅" : "❌",
          text: isApproved ? "Request Approved" : "Request Rejected",
          colorClass: isApproved ? BADGE_COLORS.green : BADGE_COLORS.red,
        }}
        title={
          isApproved
            ? "Deletion Request Approved"
            : "Deletion Request Not Approved"
        }
        subtitle={
          isApproved
            ? "Your data deletion request has been reviewed and approved."
            : "Your data deletion request has been reviewed."
        }
      />

      <EmailGreeting name={userName} text="Hello {name}," />

      {isApproved ? (
        <>
          <EmailText>
            Your request to delete your organization&apos;s data has been{" "}
            <strong>approved</strong>. The deletion will be executed after the
            grace period ends.
          </EmailText>

          <EmailDetailsCard title="Request Details">
            <EmailDetailRow label="Request ID" value={requestId} />
            {gracePeriodDate && (
              <EmailDetailRow
                label="Deletion Scheduled After"
                value={gracePeriodDate}
                isLast
              />
            )}
          </EmailDetailsCard>

          <EmailText>
            You can still cancel this request before the grace period ends by
            going to your Account Settings and navigating to the Data Control
            tab.
          </EmailText>
        </>
      ) : (
        <>
          <EmailText>
            After careful review, your data deletion request has{" "}
            <strong>not been approved</strong> at this time.
          </EmailText>

          <EmailDetailsCard title="Request Details">
            <EmailDetailRow label="Request ID" value={requestId} isLast />
          </EmailDetailsCard>
        </>
      )}

      {adminNote && (
        <EmailHighlightBox
          title="Admin Note"
          content={adminNote}
          colorClass={
            isApproved
              ? "bg-green-50 border-green-400 text-green-800"
              : "bg-red-50 border-red-400 text-red-800"
          }
        />
      )}

      {!isApproved && (
        <EmailText>
          If you have questions about this decision, please contact our support
          team for further assistance.
        </EmailText>
      )}
    </BaseLayout>
  );
};

export default DeletionRequestDecisionEmail;
