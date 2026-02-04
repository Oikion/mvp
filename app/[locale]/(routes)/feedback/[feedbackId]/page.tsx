import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { FeedbackChatPage } from "./components/FeedbackChatPage";

interface FeedbackPageProps {
  params: Promise<{ locale: string; feedbackId: string }>;
}

export default async function FeedbackChatRoute({ params }: FeedbackPageProps) {
  const { locale, feedbackId } = await params;

  // Get current user
  let currentUser;
  try {
    currentUser = await getCurrentUser();
  } catch {
    redirect(`/${locale}/app/sign-in`);
  }

  // Verify the feedback belongs to the current user
  const feedback = await prismadb.feedback.findFirst({
    where: {
      id: feedbackId,
      userId: currentUser.id,
    },
    select: {
      id: true,
      createdAt: true,
      feedbackType: true,
      feedback: true,
      url: true,
      browserName: true,
      browserVersion: true,
      osName: true,
      osVersion: true,
      screenResolution: true,
      hasScreenshot: true,
      hasConsoleLogs: true,
      consoleLogsCount: true,
      emailSent: true,
      emailSentAt: true,
      status: true,
      adminResponse: true,
      respondedAt: true,
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          url: true,
        },
      },
      FeedbackComment: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          createdAt: true,
          authorId: true,
          authorType: true,
          authorName: true,
          content: true,
          attachmentUrl: true,
          attachmentName: true,
          attachmentSize: true,
          attachmentType: true,
        },
      },
    },
  });

  if (!feedback) {
    redirect(`/${locale}/app`);
  }

  // Serialize the data and rename FeedbackComment to comments for the component
  const serializedFeedback = JSON.parse(JSON.stringify({
    ...feedback,
    comments: feedback.FeedbackComment,
    FeedbackComment: undefined,
  }));

  return (
    <FeedbackChatPage
      feedback={serializedFeedback}
      locale={locale}
      currentUserId={currentUser.id}
      currentUserName={currentUser.name}
    />
  );
}







