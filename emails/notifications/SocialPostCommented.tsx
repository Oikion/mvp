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

interface SocialPostCommentedEmailProps {
  recipientName: string;
  actorName: string;
  postContent?: string;
  commentContent: string;
  postId: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (actor: string) => `${actor} commented on your post`,
    badge: "New Comment",
    title: "New Comment on Your Post",
    subtitle: "Someone replied to your content",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} left a comment on your post.`,
    postLabel: "Your Post",
    commentLabel: "Comment",
    ctaButton: "View Comment",
    altLink: "Or view the comment at:",
    footer: "You're receiving this because someone commented on your post.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (actor: string) => `Ο/Η ${actor} σχολίασε τη δημοσίευσή σας`,
    badge: "Νέο Σχόλιο",
    title: "Νέο Σχόλιο στη Δημοσίευσή σας",
    subtitle: "Κάποιος απάντησε στο περιεχόμενό σας",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} άφησε ένα σχόλιο στη δημοσίευσή σας.`,
    postLabel: "Η Δημοσίευσή σας",
    commentLabel: "Σχόλιο",
    ctaButton: "Προβολή Σχολίου",
    altLink: "Ή δείτε το σχόλιο στο:",
    footer: "Λαμβάνετε αυτό επειδή κάποιος σχολίασε τη δημοσίευσή σας.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (actor: string) => `${actor} okomentoval váš příspěvek`,
    badge: "Nový Komentář",
    title: "Nový Komentář k Vašemu Příspěvku",
    subtitle: "Někdo odpověděl na váš obsah",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} zanechal komentář k vašemu příspěvku.`,
    postLabel: "Váš Příspěvek",
    commentLabel: "Komentář",
    ctaButton: "Zobrazit Komentář",
    altLink: "Nebo zobrazte komentář na:",
    footer: "Tento email dostáváte, protože někdo okomentoval váš příspěvek.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const SocialPostCommentedEmail = ({
  recipientName,
  actorName,
  postContent,
  commentContent,
  postId,
  userLanguage,
  userTheme,
}: SocialPostCommentedEmailProps) => {
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
        icon="💬"
        text={t.badge}
        colorClass="bg-blue-50 text-blue-700 border-blue-200"
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

      {/* Comment Preview */}
      <Section className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-5 mb-6">
        <Text className="text-blue-800 text-xs font-semibold m-0 mb-2 uppercase tracking-wide">
          {t.commentLabel}
        </Text>
        <Text className="text-blue-900 text-sm m-0 leading-relaxed">
          &ldquo;{commentContent.length > 200 ? `${commentContent.substring(0, 200)}...` : commentContent}&rdquo;
        </Text>
      </Section>

      {/* Original Post Preview */}
      {postContent && (
        <Section
          style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
          className="rounded-lg p-5 mb-6"
        >
          <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-3 uppercase tracking-wide">
            {t.postLabel}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed italic">
            &ldquo;{postContent.length > 100 ? `${postContent.substring(0, 100)}...` : postContent}&rdquo;
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

export default SocialPostCommentedEmail;
