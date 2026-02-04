import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  email: string;
  isEarlyAccess?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const WelcomeEmail = ({
  email,
  isEarlyAccess = false,
}: WelcomeEmailProps) => {
  const previewText = isEarlyAccess
    ? "Welcome to Oikion Early Access - You're in!"
    : "Welcome to the Oikion Newsletter";

  const title = isEarlyAccess
    ? "You're on the Early Access list!"
    : "Thanks for subscribing!";

  const subtitle = isEarlyAccess
    ? "Get ready to experience the future of real estate management."
    : "Stay informed about Oikion's latest features and updates.";

  const description = isEarlyAccess
    ? "As an Early Access member, you'll be among the first to try new features, provide feedback, and shape the future of Oikion. We'll notify you as soon as access becomes available."
    : "You'll receive updates about new features, tips for maximizing your real estate workflow, and exclusive insights from the Oikion team.";

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
              {isEarlyAccess && (
                <Section className="mb-6 text-center">
                  <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
                    Early Access
                  </span>
                </Section>
              )}

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {description}
              </Text>

              {/* What to expect section */}
              <Section className="bg-zinc-50 rounded-lg p-5 mb-6">
                <Text className="text-zinc-900 text-sm font-semibold m-0 mb-3">
                  What to expect:
                </Text>
                <Text className="text-zinc-600 text-sm m-0 mb-2">
                  • {isEarlyAccess ? "Priority access to new features" : "Monthly product updates"}
                </Text>
                <Text className="text-zinc-600 text-sm m-0 mb-2">
                  • {isEarlyAccess ? "Direct feedback opportunities" : "Tips and best practices"}
                </Text>
                <Text className="text-zinc-600 text-sm m-0">
                  • {isEarlyAccess ? "Early Access to the platform" : "Industry insights and news"}
                </Text>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={baseUrl}
                >
                  {isEarlyAccess ? "Learn More About Oikion" : "Visit Oikion"}
                </Button>
              </Section>

              <Text className="text-zinc-500 text-xs text-center m-0">
                Or copy this link:{" "}
                <Link
                  href={baseUrl}
                  className="text-zinc-700 underline"
                >
                  {baseUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                You're receiving this email because you signed up at{" "}
                <Link href={baseUrl} className="text-zinc-500 underline">
                  oikion.com
                </Link>
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                <Link href={`${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`} className="text-zinc-500 underline">
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

export default WelcomeEmail;
