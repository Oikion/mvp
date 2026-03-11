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

interface DealProposedEmailProps {
  recipientName: string;
  proposerName: string;
  dealId: string;
  dealTitle?: string;
  propertyName: string;
  clientName: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (proposer: string) => `${proposer} proposed a new deal`,
    badge: "New Deal Proposal",
    title: "New Deal Proposal",
    subtitle: "Review and respond to this opportunity",
    greeting: (name: string) => `Hello ${name},`,
    intro: (proposer: string) => `${proposer} has proposed a new deal on Oikion that requires your attention.`,
    dealDetails: "Deal Details",
    propertyLabel: "Property",
    clientLabel: "Client",
    ctaButton: "View Deal",
    altLink: "Or view at:",
    footer: "You're receiving this because a deal was proposed to you.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (proposer: string) => `Ο/Η ${proposer} πρότεινε μια νέα συμφωνία`,
    badge: "Νέα Πρόταση Συμφωνίας",
    title: "Νέα Πρόταση Συμφωνίας",
    subtitle: "Εξετάστε και απαντήστε σε αυτή την ευκαιρία",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (proposer: string) => `Ο/Η ${proposer} πρότεινε μια νέα συμφωνία στο Oikion που απαιτεί την προσοχή σας.`,
    dealDetails: "Λεπτομέρειες Συμφωνίας",
    propertyLabel: "Ακίνητο",
    clientLabel: "Πελάτης",
    ctaButton: "Προβολή Συμφωνίας",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή σας προτάθηκε μια συμφωνία.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (proposer: string) => `${proposer} navrhl nový obchod`,
    badge: "Nový Návrh Obchodu",
    title: "Nový Návrh Obchodu",
    subtitle: "Zkontrolujte a reagujte na tuto příležitost",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (proposer: string) => `${proposer} navrhl nový obchod na Oikionu, který vyžaduje vaši pozornost.`,
    dealDetails: "Detaily Obchodu",
    propertyLabel: "Nemovitost",
    clientLabel: "Klient",
    ctaButton: "Zobrazit Obchod",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože vám byl navržen obchod.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const DealProposedEmail = ({
  recipientName,
  proposerName,
  dealId,
  dealTitle,
  propertyName,
  clientName,
  userLanguage,
  userTheme,
}: DealProposedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const dealUrl = `${baseUrl}/app/deals/${dealId}`;

  return (
    <BaseLayout
      previewText={t.preview(proposerName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="🤝"
        text={t.badge}
        colorClass="bg-amber-50 text-amber-700 border-amber-200"
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
        {t.intro(proposerName)}
      </Text>

      {/* Deal Details */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.dealDetails}
        </Text>

        {dealTitle && (
          <Section className="mb-4">
            <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
              {dealTitle}
            </Text>
          </Section>
        )}

        <Section className="mb-3">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.propertyLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
            🏠 {propertyName}
          </Text>
        </Section>

        <Section>
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.clientLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
            👤 {clientName}
          </Text>
        </Section>
      </Section>

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

export default DealProposedEmail;
