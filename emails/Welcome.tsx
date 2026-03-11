import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import {
  BaseLayout,
  EmailBadge,
  resolveColors,
} from "./components/BaseLayout";

interface WelcomeEmailProps {
  email: string;
  isEarlyAccess?: boolean;
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

export const WelcomeEmail = ({
  email,
  isEarlyAccess = false,
  userTheme,
}: WelcomeEmailProps) => {
  const unsubscribeUrl = buildUnsubscribeUrl(email);
  const colors = resolveColors(userTheme);

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
    <BaseLayout
      previewText={previewText}
      footerText={`You're receiving this email because you signed up at oikion.com`}
      emailTheme={userTheme}
    >
      {isEarlyAccess && (
        <EmailBadge
          icon=""
          text="Early Access"
          colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
      )}

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {description}
      </Text>

      {/* What to expect section */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-3">
          What to expect:
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          • {isEarlyAccess ? "Priority access to new features" : "Monthly product updates"}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">
          • {isEarlyAccess ? "Direct feedback opportunities" : "Tips and best practices"}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0">
          • {isEarlyAccess ? "Early Access to the platform" : "Industry insights and news"}
        </Text>
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={baseUrl}
        >
          {isEarlyAccess ? "Learn More About Oikion" : "Visit Oikion"}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-6">
        Or copy this link:{" "}
        <Link href={baseUrl} style={{ color: colors.linkColor }} className="underline">
          {baseUrl}
        </Link>
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

export default WelcomeEmail;
