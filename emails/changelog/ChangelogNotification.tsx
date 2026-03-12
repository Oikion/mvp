import {
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { Markdown } from "@react-email/markdown";
import * as React from "react";
import {
  BaseLayout,
  EmailBadge,
  EmailCTAButton,
  BADGE_COLORS,
  baseUrl,
  resolveColors,
} from "@/emails/components/BaseLayout";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Oikion";

export interface ChangelogNotificationProps {
  username: string;
  email: string;
  version: string;
  title: string;
  description: string;
  category: { name: string; color: string; icon: string } | null;
  tags: { name: string; color: string }[];
  publishedAt: string;
}

// Map changelog category colors to BADGE_COLORS keys
const colorToBadgeClass: Record<string, string> = {
  blue: BADGE_COLORS.blue,
  indigo: BADGE_COLORS.indigo,
  purple: BADGE_COLORS.purple,
  pink: BADGE_COLORS.pink,
  red: BADGE_COLORS.red,
  orange: BADGE_COLORS.orange,
  amber: BADGE_COLORS.amber,
  green: BADGE_COLORS.green,
  emerald: BADGE_COLORS.emerald,
  cyan: BADGE_COLORS.cyan,
};

export const ChangelogNotification = ({
  username,
  email,
  version,
  title,
  description,
  category,
  tags,
  publishedAt,
}: ChangelogNotificationProps) => {
  const previewText = `What's new in ${appName} — v${version}: ${title}`;
  const changelogUrl = `${baseUrl}/changelog`;
  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const badgeColor = category
    ? colorToBadgeClass[category.color] || BADGE_COLORS.blue
    : BADGE_COLORS.blue;

  return (
    <BaseLayout
      previewText={previewText}
      footerText={`You received this because you are a registered ${appName} user.`}
    >
      {/* Category badge */}
      <EmailBadge
        icon={category ? "🔖" : "📋"}
        text={category ? category.name : "Platform Update"}
        colorClass={badgeColor}
      />

      {/* Version + Title */}
      <Section className="mb-2 text-center">
        <Text className="text-zinc-400 text-xs font-mono m-0 mb-1 tracking-wider uppercase">
          v{version}
        </Text>
      </Section>
      <Text className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-2 leading-tight">
        {title}
      </Text>
      <Text className="text-zinc-500 text-xs text-center m-0 mb-6">
        Released {publishedAt}
      </Text>

      {/* Tags row */}
      {tags.length > 0 && (
        <Section className="mb-4 text-center">
          <Text className="text-zinc-500 text-xs m-0">
            {tags.map((t) => t.name).join(" · ")}
          </Text>
        </Section>
      )}

      <Hr className="border-zinc-200 my-6" />

      {/* Greeting */}
      <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
        Hello {username},
      </Text>

      {/* Description */}
      <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-6">
        <div className="text-zinc-700 text-sm leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-blue-600 [&>a]:underline [&>h1]:text-lg [&>h1]:font-semibold [&>h2]:text-base [&>h2]:font-semibold [&>h3]:text-sm [&>h3]:font-semibold [&>blockquote]:border-l-4 [&>blockquote]:border-zinc-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-zinc-600">
          <Markdown>{description}</Markdown>
        </div>
      </Section>

      {/* CTA */}
      <EmailCTAButton href={changelogUrl} text="View Full Changelog" colors={resolveColors()} />

      {/* Admin note */}
      <Text className="text-zinc-500 text-xs text-center m-0 mt-4">
        Sent by the {appName} Team
      </Text>

      {/* Unsubscribe */}
      <Text className="text-zinc-400 text-xs text-center m-0 mt-4">
        <Link href={unsubscribeUrl} className="text-zinc-500 underline">
          Unsubscribe from product updates
        </Link>
        {" · "}
        <Link href={`${baseUrl}/legal/privacy-policy`} className="text-zinc-500 underline">
          Privacy Policy
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ChangelogNotification;
