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

interface FeedbackEmailProps {
  feedbackType: string;
  feedbackTypeLabel: string;
  feedback: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  url?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  screenResolution?: string;
  timestamp?: string;
  consoleLogs?: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
  hasScreenshot?: boolean;
  hasConsoleLogsFile?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

export const FeedbackEmail = ({
  feedbackType,
  feedbackTypeLabel,
  feedback,
  userId,
  userName,
  userEmail,
  organizationId,
  url,
  browserName,
  browserVersion,
  osName,
  osVersion,
  screenResolution,
  timestamp,
  consoleLogs,
  hasScreenshot,
  hasConsoleLogsFile,
}: FeedbackEmailProps) => {
  const previewText = `New ${feedbackTypeLabel} from ${process.env.NEXT_PUBLIC_APP_NAME}`;
  const isBugReport = feedbackType === "bug";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-300 rounded-md my-[40px] mx-auto p-[20px] w-[600px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              New {feedbackTypeLabel}
            </Heading>

            {/* User Information Section */}
            <Section className="bg-slate-50 rounded-md p-4 mb-4">
              <Text className="text-black text-[16px] font-semibold mb-2 mt-0">
                User Information
              </Text>
              {userId && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>User ID:</strong> {userId}
                </Text>
              )}
              {userName && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Name:</strong> {userName}
                </Text>
              )}
              {userEmail && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Email:</strong> {userEmail}
                </Text>
              )}
              {organizationId && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Organization ID:</strong> {organizationId}
                </Text>
              )}
            </Section>

            {/* Feedback Message Section */}
            <Section className="mb-4">
              <Text className="text-black text-[16px] font-semibold mb-2 mt-0">
                Feedback Message
              </Text>
              <Section className="bg-white border border-solid border-slate-200 rounded-md p-4">
                <Text className="text-black text-[14px] leading-[24px] whitespace-pre-wrap m-0">
                  {feedback}
                </Text>
              </Section>
            </Section>

            {/* Technical Details Section */}
            <Section className="bg-slate-50 rounded-md p-4 mb-4">
              <Text className="text-black text-[16px] font-semibold mb-2 mt-0">
                Technical Details
              </Text>
              {url && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>URL:</strong> {url}
                </Text>
              )}
              {browserName && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Browser:</strong> {browserName}
                  {browserVersion && ` ${browserVersion}`}
                </Text>
              )}
              {osName && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Operating System:</strong> {osName}
                  {osVersion && ` ${osVersion}`}
                </Text>
              )}
              {screenResolution && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Screen Resolution:</strong> {screenResolution}
                </Text>
              )}
              {timestamp && (
                <Text className="text-black text-[14px] leading-[24px] m-0">
                  <strong>Timestamp:</strong> {new Date(timestamp).toLocaleString()}
                </Text>
              )}
            </Section>

            {/* Bug Report Specific Section */}
            {isBugReport && (
              <Section className="bg-red-50 border border-solid border-red-200 rounded-md p-4 mb-4">
                <Text className="text-[16px] font-semibold mb-2 mt-0 text-red-800">
                  Bug Report Details
                </Text>
                {hasScreenshot && (
                  <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                    <strong>Screenshot:</strong> Attached to this email
                  </Text>
                )}
                {hasConsoleLogsFile && (
                  <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                    <strong>Console Logs:</strong> Full console logs attached as .txt file
                  </Text>
                )}
                {consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0 && (
                  <>
                    <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                      <strong>Warnings & Errors:</strong> {consoleLogs.length} found (shown below)
                    </Text>
                    <Section className="bg-white border border-solid border-red-200 rounded-md p-3 mt-2 max-h-[300px] overflow-y-auto">
                      {consoleLogs.map((log, index) => {
                        const logType = log.type?.toLowerCase() || 'log';
                        const isError = logType === 'error' || logType === 'err';
                        const isWarning = logType === 'warning' || logType === 'warn';
                        return (
                          <Text
                            key={index}
                            className={`text-[12px] leading-[20px] m-0 font-mono ${
                              isError ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-black'
                            }`}
                          >
                            [{index + 1}] {new Date(log.timestamp).toLocaleString()} [
                            {log.type.toUpperCase()}]: {log.message}
                          </Text>
                        );
                      })}
                    </Section>
                  </>
                )}
                {hasConsoleLogsFile && (!consoleLogs || consoleLogs.length === 0) && (
                  <Text className="text-black text-[14px] leading-[24px] m-0 mb-2">
                    <strong>Note:</strong> No warnings or errors found in console logs. Check the attached .txt file for all console entries.
                  </Text>
                )}
              </Section>
            )}

            <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
            <Text className="text-slate-500 text-muted-foreground text-[12px] leading-[24px] text-center">
              This feedback was submitted from {process.env.NEXT_PUBLIC_APP_NAME}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default FeedbackEmail;

