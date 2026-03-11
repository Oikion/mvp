import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

interface SocialPostLikedEmailProps {
  recipientName: string;
  actorName: string;
  postContent?: string;
  postId: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (actor: string) => `${actor} liked your post`,
    badge: "New Like",
    title: "Someone Liked Your Post",
    subtitle: "Your content is getting engagement",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} liked your post on the Oikion feed.`,
    postLabel: "Your Post",
    ctaButton: "View Post",
    altLink: "Or view the post at:",
    footer: "You're receiving this because of activity on your post.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (actor: string) => `Ο/Η ${actor} έκανε like στη δημοσίευσή σας`,
    badge: "Νέο Like",
    title: "Κάποιος Έκανε Like στη Δημοσίευσή σας",
    subtitle: "Το περιεχόμενό σας λαμβάνει αλληλεπίδραση",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} έκανε like στη δημοσίευσή σας στο Oikion feed.`,
    postLabel: "Η Δημοσίευσή σας",
    ctaButton: "Προβολή Δημοσίευσης",
    altLink: "Ή δείτε τη δημοσίευση στο:",
    footer: "Λαμβάνετε αυτό λόγω δραστηριότητας στη δημοσίευσή σας.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (actor: string) => `${actor} se líbil váš příspěvek`,
    badge: "Nový Like",
    title: "Někomu se Líbil Váš Příspěvek",
    subtitle: "Váš obsah získává interakce",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} se líbil váš příspěvek na Oikion feedu.`,
    postLabel: "Váš Příspěvek",
    ctaButton: "Zobrazit Příspěvek",
    altLink: "Nebo zobrazte příspěvek na:",
    footer: "Tento email dostáváte kvůli aktivitě na vašem příspěvku.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const SocialPostLikedEmail = ({
  recipientName,
  actorName,
  postContent,
  postId,
  userLanguage,
  userTheme,
}: SocialPostLikedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const postUrl = `${baseUrl}/app/feed/post/${postId}`;

  return (
    <BaseLayout
      previewText={t.preview(actorName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="❤️"
        text={t.badge}
        colorClass="bg-pink-50 text-pink-700 border-pink-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro(actorName)}
      </Text>

      {/* Post Preview */}
      {postContent && (
        <Section
          style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-lg p-5 mb-6"
        >
          <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-3 uppercase tracking-wide">
            {t.postLabel}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed italic">
            &ldquo;{postContent.length > 150 ? `${postContent.substring(0, 150)}...` : postContent}&rdquo;
          </Text>
        </Section>
      )}

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={postUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={postUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {postUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default SocialPostLikedEmail;
