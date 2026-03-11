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

interface SocialPostMentionedEmailProps {
  recipientName: string;
  actorName: string;
  postContent: string;
  postId: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (actor: string) => `${actor} mentioned you in a post`,
    badge: "You Were Mentioned",
    title: "You Were Mentioned in a Post",
    subtitle: "Someone is talking about you",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} mentioned you in a post on the Oikion feed.`,
    postLabel: "Post Content",
    ctaButton: "View Post",
    altLink: "Or view the post at:",
    footer: "You're receiving this because you were mentioned in a post.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (actor: string) => `Ο/Η ${actor} σας ανέφερε σε μια δημοσίευση`,
    badge: "Αναφερθήκατε",
    title: "Αναφερθήκατε σε μια Δημοσίευση",
    subtitle: "Κάποιος μιλάει για εσάς",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} σας ανέφερε σε μια δημοσίευση στο Oikion feed.`,
    postLabel: "Περιεχόμενο Δημοσίευσης",
    ctaButton: "Προβολή Δημοσίευσης",
    altLink: "Ή δείτε τη δημοσίευση στο:",
    footer: "Λαμβάνετε αυτό επειδή αναφερθήκατε σε μια δημοσίευση.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (actor: string) => `${actor} vás zmínil v příspěvku`,
    badge: "Byli jste Zmíněni",
    title: "Byli jste Zmíněni v Příspěvku",
    subtitle: "Někdo o vás mluví",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} vás zmínil v příspěvku na Oikion feedu.`,
    postLabel: "Obsah Příspěvku",
    ctaButton: "Zobrazit Příspěvek",
    altLink: "Nebo zobrazte příspěvek na:",
    footer: "Tento email dostáváte, protože jste byli zmíněni v příspěvku.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const SocialPostMentionedEmail = ({
  recipientName,
  actorName,
  postContent,
  postId,
  userLanguage,
  userTheme,
}: SocialPostMentionedEmailProps) => {
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
        icon="@️"
        text={t.badge}
        colorClass="bg-indigo-50 text-indigo-700 border-indigo-200"
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
      <Section className="bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg p-5 mb-6">
        <Text className="text-indigo-800 text-xs font-semibold m-0 mb-2 uppercase tracking-wide">
          {t.postLabel}
        </Text>
        <Text className="text-indigo-900 text-sm m-0 leading-relaxed">
          &ldquo;{postContent.length > 200 ? `${postContent.substring(0, 200)}...` : postContent}&rdquo;
        </Text>
      </Section>

      {/* CTA Button */}
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

export default SocialPostMentionedEmail;
