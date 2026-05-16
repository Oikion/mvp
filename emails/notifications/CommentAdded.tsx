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

type CommentEntityType = "PROPERTY" | "CONTACT" | "REQUEST" | "DEAL";

interface CommentAddedEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  entityType?: CommentEntityType;
  metadata?: {
    commentPreview?: string;
    commentContent?: string;
    entityType?: CommentEntityType;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const entityTypeRoutes: Record<CommentEntityType, string> = {
  PROPERTY: "mls/properties",
  CONTACT: "crm/contacts",
  REQUEST: "requests",
  DEAL: "deals",
};

const translations = {
  en: {
    preview: (actor: string) => `${actor} added a comment`,
    badge: "New Comment",
    title: "New Comment Added",
    subtitle: "Someone has commented on a record you're following",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string, entity: string) => `${actor} has added a new comment on "${entity}".`,
    introNoEntity: (actor: string) => `${actor} has added a new comment.`,
    commentLabel: "Comment",
    entityLabel: "On",
    entityTypes: {
      PROPERTY: "Property",
      CONTACT: "Contact",
      REQUEST: "Request",
      DEAL: "Deal",
    },
    ctaButton: "View & Reply",
    altLink: "Or view at:",
    footer: "You're receiving this because someone commented on a record you're involved with.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (actor: string) => `Ο/Η ${actor} πρόσθεσε σχόλιο`,
    badge: "Νέο Σχόλιο",
    title: "Νέο Σχόλιο Προστέθηκε",
    subtitle: "Κάποιος σχολίασε σε μια εγγραφή που παρακολουθείτε",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string, entity: string) => `Ο/Η ${actor} πρόσθεσε νέο σχόλιο στο "${entity}".`,
    introNoEntity: (actor: string) => `Ο/Η ${actor} πρόσθεσε νέο σχόλιο.`,
    commentLabel: "Σχόλιο",
    entityLabel: "Σε",
    entityTypes: {
      PROPERTY: "Ακίνητο",
      CONTACT: "Επαφή",
      REQUEST: "Αίτημα",
      DEAL: "Συναλλαγή",
    },
    ctaButton: "Προβολή & Απάντηση",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή κάποιος σχολίασε σε εγγραφή που σας αφορά.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (actor: string) => `${actor} přidal komentář`,
    badge: "Nový Komentář",
    title: "Přidán Nový Komentář",
    subtitle: "Někdo okomentoval záznam, který sledujete",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string, entity: string) => `${actor} přidal nový komentář k "${entity}".`,
    introNoEntity: (actor: string) => `${actor} přidal nový komentář.`,
    commentLabel: "Komentář",
    entityLabel: "K",
    entityTypes: {
      PROPERTY: "Nemovitost",
      CONTACT: "Kontakt",
      REQUEST: "Požadavek",
      DEAL: "Obchod",
    },
    ctaButton: "Zobrazit & Odpovědět",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože někdo okomentoval záznam, kterého se účastníte.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const CommentAddedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  entityType,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: CommentAddedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const resolvedEntityType = (metadata?.entityType || entityType || "PROPERTY") as CommentEntityType;
  const route = entityTypeRoutes[resolvedEntityType] || "app";
  const entityUrl = `${baseUrl}/app/${route}/${entityId}`;
  const commentText = metadata?.commentPreview || metadata?.commentContent;
  const truncatedComment = commentText && commentText.length > 250
    ? `${commentText.substring(0, 250)}...`
    : commentText;
  const entityTypeLabel = t.entityTypes[resolvedEntityType] || resolvedEntityType;

  return (
    <BaseLayout
      previewText={t.preview(actorName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon="💬"
        text={t.badge}
        colorClass="bg-violet-50 text-violet-700 border-violet-200"
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
        {entityName
          ? t.intro(actorName, entityName)
          : t.introNoEntity(actorName)}
      </Text>

      {/* Comment Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        {entityName && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.entityLabel} ({entityTypeLabel})
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0">
              {entityName}
            </Text>
          </Section>
        )}

        {truncatedComment && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-2 uppercase tracking-wide">
              {t.commentLabel}
            </Text>
            <Section
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                padding: '12px 16px',
                margin: '16px 0',
              }}
            >
              <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed italic">
                "{truncatedComment}"
              </Text>
            </Section>
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mt-2">
              — {actorName}
            </Text>
          </Section>
        )}
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={entityUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={entityUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {entityUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default CommentAddedEmail;
