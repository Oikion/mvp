import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { Markdown } from "@react-email/markdown";
import * as React from "react";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

interface MessageToAllUsersEmailProps {
  username: string;
  title: string;
  message: string;
  email: string;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Oikion";

export const MessageToAllUsers = ({
  title,
  message,
  username,
  email,
  userTheme,
}: MessageToAllUsersEmailProps) => {
  const colors = resolveColors(userTheme);
  const previewText = `${title} - Important announcement from ${appName}`;
  const unsubscribeUrl = buildUnsubscribeUrl(email);

  return (
    <BaseLayout
      previewText={previewText}
      footerText={`You received this email because you are a registered user of ${appName}.`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="📢"
        text="Platform Announcement"
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-6"
      >
        {title}
      </Heading>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Greeting */}
      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        Hello {username},
      </Text>

      {/* Message Content */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-6 mb-6"
      >
        <div className="text-sm leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:underline [&>h1]:text-lg [&>h1]:font-semibold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:pl-4 [&>blockquote]:italic" style={{ color: colors.textSecondary }}>
          <Markdown>{message}</Markdown>
        </div>
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={baseUrl}
        >
          Go to {appName}
        </Button>
      </Section>

      {/* Admin signature */}
      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0">
        Sent by the {appName} Team
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      {/* Unsubscribe links */}
      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        If you think you received this by mistake, please{" "}
        <Link href="mailto:support@oikion.com" style={{ color: colors.linkColor }} className="underline">
          contact us
        </Link>
        .
      </Text>
      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mt-2">
        <Link href={unsubscribeUrl} style={{ color: colors.linkColor }} className="underline">
          Unsubscribe
        </Link>
        {" • "}
        <Link href={`${baseUrl}/legal/privacy-policy`} style={{ color: colors.linkColor }} className="underline">
          Privacy Policy
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default MessageToAllUsers;
