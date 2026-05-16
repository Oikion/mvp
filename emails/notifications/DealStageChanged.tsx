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

interface DealStageChangedEmailProps {
  recipientName: string;
  actorName: string;
  entityId: string;
  entityName?: string;
  metadata?: {
    fromStage?: string;
    toStage?: string;
    dealTitle?: string;
    propertyName?: string;
    contactName?: string;
  };
  userLanguage: string;
  userTheme?: string;
  unsubscribeUrl?: string;
}

const stageLabels: Record<string, Record<string, string>> = {
  en: {
    INTEREST: "Interest",
    OFFER: "Offer",
    NEGOTIATION: "Negotiation",
    PRELIMINARY_AGREEMENT: "Preliminary Agreement",
    DUE_DILIGENCE: "Due Diligence",
    TRANSFER_TAX: "Transfer Tax",
    SIGNING: "Signing",
    REGISTRATION: "Registration",
    COMPLETED: "Completed",
    FALLEN_THROUGH: "Fallen Through",
  },
  el: {
    INTEREST: "Ενδιαφέρον",
    OFFER: "Προσφορά",
    NEGOTIATION: "Διαπραγμάτευση",
    PRELIMINARY_AGREEMENT: "Προσύμφωνο",
    DUE_DILIGENCE: "Νομικός Έλεγχος",
    TRANSFER_TAX: "Φόρος Μεταβίβασης",
    SIGNING: "Υπογραφή",
    REGISTRATION: "Εγγραφή",
    COMPLETED: "Ολοκληρώθηκε",
    FALLEN_THROUGH: "Ναυάγησε",
  },
  cz: {
    INTEREST: "Zájem",
    OFFER: "Nabídka",
    NEGOTIATION: "Jednání",
    PRELIMINARY_AGREEMENT: "Předběžná Smlouva",
    DUE_DILIGENCE: "Due Diligence",
    TRANSFER_TAX: "Daň z Převodu",
    SIGNING: "Podpis",
    REGISTRATION: "Registrace",
    COMPLETED: "Dokončeno",
    FALLEN_THROUGH: "Ztroskotalo",
  },
};

const translations = {
  en: {
    preview: "Deal stage updated",
    badge: "Stage Updated",
    title: "Deal Stage Updated",
    subtitle: "The pipeline stage for a deal has changed",
    greeting: (name: string) => `Hello ${name},`,
    intro: (actor: string) => `${actor} has updated the stage of a deal.`,
    dealDetails: "Deal Details",
    dealLabel: "Deal",
    propertyLabel: "Property",
    contactLabel: "Contact",
    fromStageLabel: "Previous Stage",
    toStageLabel: "New Stage",
    ctaButton: "View Deal",
    altLink: "Or view at:",
    footer: "You're receiving this because of a stage change in a deal you're involved with.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Ενημέρωση σταδίου συναλλαγής",
    badge: "Στάδιο Ενημερώθηκε",
    title: "Ενημέρωση Σταδίου Συναλλαγής",
    subtitle: "Το στάδιο συναλλαγής στη διαδικασία άλλαξε",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (actor: string) => `Ο/Η ${actor} ενημέρωσε το στάδιο της συναλλαγής.`,
    dealDetails: "Λεπτομέρειες Συναλλαγής",
    dealLabel: "Συναλλαγή",
    propertyLabel: "Ακίνητο",
    contactLabel: "Επαφή",
    fromStageLabel: "Προηγούμενο Στάδιο",
    toStageLabel: "Νέο Στάδιο",
    ctaButton: "Προβολή Συναλλαγής",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό λόγω αλλαγής σταδίου σε συναλλαγή που αφορά εσάς.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Fáze obchodu aktualizována",
    badge: "Fáze Aktualizována",
    title: "Fáze Obchodu Aktualizována",
    subtitle: "Fáze v pipeline obchodu se změnila",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (actor: string) => `${actor} aktualizoval fázi obchodu.`,
    dealDetails: "Detaily Obchodu",
    dealLabel: "Obchod",
    propertyLabel: "Nemovitost",
    contactLabel: "Kontakt",
    fromStageLabel: "Předchozí Fáze",
    toStageLabel: "Nová Fáze",
    ctaButton: "Zobrazit Obchod",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte z důvodu změny fáze obchodu, kterého se účastníte.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

const resolveStageLabel = (stage: string | undefined, lang: string): string => {
  if (!stage) return "—";
  const langLabels = stageLabels[lang] || stageLabels.en;
  return langLabels[stage] || stage;
};

export const DealStageChangedEmail = ({
  recipientName,
  actorName,
  entityId,
  entityName,
  metadata,
  userLanguage,
  userTheme,
  unsubscribeUrl,
}: DealStageChangedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const dealUrl = `${baseUrl}/app/deals/${entityId}`;
  const dealTitle = metadata?.dealTitle || entityName;

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailBadge
        icon="⬆"
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

      {/* Deal Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.dealDetails}
        </Text>

        {dealTitle && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.dealLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0">
              {dealTitle}
            </Text>
          </Section>
        )}

        {metadata?.propertyName && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.propertyLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              🏠 {metadata.propertyName}
            </Text>
          </Section>
        )}

        {metadata?.contactName && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.contactLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              👤 {metadata.contactName}
            </Text>
          </Section>
        )}

        {metadata?.fromStage && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.fromStageLabel}
            </Text>
            <span className="inline-block text-xs font-semibold px-2 py-1 rounded border bg-zinc-50 text-zinc-600 border-zinc-200">
              {resolveStageLabel(metadata.fromStage, userLanguage)}
            </span>
          </Section>
        )}

        {metadata?.toStage && (
          <Section className="mb-0">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.toStageLabel}
            </Text>
            <span className="inline-block text-xs font-semibold px-2 py-1 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
              {resolveStageLabel(metadata.toStage, userLanguage)}
            </span>
          </Section>
        )}
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={dealUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={dealUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {dealUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default DealStageChangedEmail;
