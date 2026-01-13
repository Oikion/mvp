import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Markdown } from "@react-email/markdown";
import * as React from "react";

interface MessageToAllUsersEmailProps {
  username: string;
  title: string;
  message: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Oikion";

export const MessageToAllUsers = ({
  title,
  message,
  username,
}: MessageToAllUsersEmailProps) => {
  const previewText = `${title} - Important announcement from ${appName}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                  📢 Platform Announcement
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-6">
                {title}
              </Heading>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                Hello {username},
              </Text>

              {/* Message Content */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-6">
                <div className="text-zinc-700 text-sm leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-blue-600 [&>a]:underline [&>h1]:text-lg [&>h1]:font-semibold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-zinc-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-zinc-600">
                  <Markdown>{message}</Markdown>
                </div>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={baseUrl}
                >
                  Go to {appName}
                </Button>
              </Section>

              {/* Admin signature */}
              <Text className="text-zinc-500 text-xs text-center m-0">
                Sent by the {appName} Team
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                You received this email because you are a registered user of{" "}
                <Link href={baseUrl} className="text-zinc-500 underline">
                  {appName}
                </Link>
                .
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0">
                If you think you received this by mistake, please{" "}
                <Link href="mailto:support@oikion.com" className="text-zinc-500 underline">
                  contact us
                </Link>
                .
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-4">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-2">
                <Link href={`${baseUrl}/unsubscribe`} className="text-zinc-500 underline">
                  Unsubscribe
                </Link>
                {" • "}
                <Link href={`${baseUrl}/legal/privacy-policy`} className="text-zinc-500 underline">
                  Privacy Policy
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MessageToAllUsers;
