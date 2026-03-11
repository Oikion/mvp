import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, resolveColors } from "./components/BaseLayout";

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
  userTheme?: string;
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
  userTheme,
}: FeedbackEmailProps) => {
  const previewText = `New ${feedbackTypeLabel} from ${process.env.NEXT_PUBLIC_APP_NAME}`;
  const isBugReport = feedbackType === "bug";
  const colors = resolveColors(userTheme);

  return (
    <BaseLayout
      previewText={previewText}
      footerText={`This feedback was submitted from ${process.env.NEXT_PUBLIC_APP_NAME}`}
      emailTheme={userTheme}
    >
      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-normal text-center p-0 my-8 mx-0"
      >
        New {feedbackTypeLabel}
      </Heading>

      {/* User Information Section */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-4 mb-4"
      >
        <Text style={{ color: colors.textPrimary }} className="text-base font-semibold mb-2 mt-0">
          User Information
        </Text>
        {userId && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>User ID:</strong> {userId}
          </Text>
        )}
        {userName && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Name:</strong> {userName}
          </Text>
        )}
        {userEmail && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Email:</strong> {userEmail}
          </Text>
        )}
        {organizationId && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Organization ID:</strong> {organizationId}
          </Text>
        )}
      </Section>

      {/* Feedback Message Section */}
      <Section className="mb-4">
        <Text style={{ color: colors.textPrimary }} className="text-base font-semibold mb-2 mt-0">
          Feedback Message
        </Text>
        <Section
          style={{ backgroundColor: colors.containerBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-md p-4"
        >
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 whitespace-pre-wrap m-0">
            {feedback}
          </Text>
        </Section>
      </Section>

      {/* Technical Details Section */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-md p-4 mb-4"
      >
        <Text style={{ color: colors.textPrimary }} className="text-base font-semibold mb-2 mt-0">
          Technical Details
        </Text>
        {url && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>URL:</strong> {url}
          </Text>
        )}
        {browserName && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Browser:</strong> {browserName}
            {browserVersion && ` ${browserVersion}`}
          </Text>
        )}
        {osName && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Operating System:</strong> {osName}
            {osVersion && ` ${osVersion}`}
          </Text>
        )}
        {screenResolution && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Screen Resolution:</strong> {screenResolution}
          </Text>
        )}
        {timestamp && (
          <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0">
            <strong>Timestamp:</strong> {new Date(timestamp).toLocaleString()}
          </Text>
        )}
      </Section>

      {/* Bug Report Specific Section */}
      {isBugReport && (
        <Section className="bg-red-50 border border-solid border-red-200 rounded-md p-4 mb-4">
          <Text className="text-base font-semibold mb-2 mt-0 text-red-800">
            Bug Report Details
          </Text>
          {hasScreenshot && (
            <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
              <strong>Screenshot:</strong> Attached to this email
            </Text>
          )}
          {hasConsoleLogsFile && (
            <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
              <strong>Console Logs:</strong> Full console logs attached as .txt file
            </Text>
          )}
          {consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0 && (
            <>
              <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
                <strong>Warnings &amp; Errors:</strong> {consoleLogs.length} found (shown below)
              </Text>
              <Section className="bg-white border border-solid border-red-200 rounded-md p-3 mt-2">
                {consoleLogs.map((log, index) => {
                  const logType = log.type?.toLowerCase() || 'log';
                  const isError = logType === 'error' || logType === 'err';
                  const isWarning = logType === 'warning' || logType === 'warn';
                  return (
                    <Text
                      key={index}
                      className={`text-xs leading-5 m-0 font-mono ${
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
            <Text style={{ color: colors.textPrimary }} className="text-sm leading-6 m-0 mb-2">
              <strong>Note:</strong> No warnings or errors found in console logs. Check the attached .txt file for all console entries.
            </Text>
          )}
        </Section>
      )}

      <Hr style={{ borderColor: colors.hrColor }} className="my-6 w-full" />
    </BaseLayout>
  );
};

export default FeedbackEmail;
