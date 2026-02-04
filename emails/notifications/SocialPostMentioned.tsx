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
import * as React from "react";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

interface SocialPostMentionedEmailProps {
  recipientName: string;
  actorName: string;
  postContent: string;
  postId: string;
  userLanguage: string;
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
}: SocialPostMentionedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const postUrl = `${baseUrl}/app/feed/post/${postId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(actorName)}</Preview>
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
                <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-200">
                  @️ {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(actorName)}
              </Text>

              {/* Post Preview */}
              <Section className="bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg p-5 mb-6">
                <Text className="text-indigo-800 text-xs font-semibold m-0 mb-2 uppercase tracking-wide">
                  {t.postLabel}
                </Text>
                <Text className="text-indigo-900 text-sm m-0 leading-relaxed">
                  "{postContent.length > 200 ? `${postContent.substring(0, 200)}...` : postContent}"
                </Text>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={postUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={postUrl} className="text-blue-600 text-xs underline break-all">
                  {postUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer} {t.footerNote}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SocialPostMentionedEmail;
