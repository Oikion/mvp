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

interface ConnectionRequestEmailProps {
  recipientName: string;
  requesterName: string;
  requesterTitle?: string;
  connectionId: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (requester: string) => `${requester} wants to connect with you`,
    badge: "New Connection Request",
    title: "New Connection Request",
    subtitle: "Expand your professional network",
    greeting: (name: string) => `Hello ${name},`,
    intro: (requester: string) => `${requester} has sent you a connection request on Oikion.`,
    requesterLabel: "Connection Request From",
    ctaButton: "View Request",
    altLink: "Or view at:",
    footer: "You're receiving this because you received a connection request.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (requester: string) => `Ο/Η ${requester} θέλει να συνδεθεί μαζί σας`,
    badge: "Νέο Αίτημα Σύνδεσης",
    title: "Νέο Αίτημα Σύνδεσης",
    subtitle: "Επεκτείνετε το επαγγελματικό σας δίκτυο",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (requester: string) => `Ο/Η ${requester} σας έστειλε ένα αίτημα σύνδεσης στο Oikion.`,
    requesterLabel: "Αίτημα Σύνδεσης Από",
    ctaButton: "Προβολή Αιτήματος",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή λάβατε ένα αίτημα σύνδεσης.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (requester: string) => `${requester} se s vámi chce spojit`,
    badge: "Nová Žádost o Spojení",
    title: "Nová Žádost o Spojení",
    subtitle: "Rozšiřte svou profesní síť",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (requester: string) => `${requester} vám poslal žádost o spojení na Oikionu.`,
    requesterLabel: "Žádost o Spojení Od",
    ctaButton: "Zobrazit Žádost",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože jste obdrželi žádost o spojení.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const ConnectionRequestEmail = ({
  recipientName,
  requesterName,
  requesterTitle,
  connectionId,
  userLanguage,
  userTheme,
}: ConnectionRequestEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const connectionUrl = `${baseUrl}/app/network/connections?request=${connectionId}`;

  return (
    <BaseLayout
      previewText={t.preview(requesterName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="🤝"
        text={t.badge}
        colorClass="bg-purple-50 text-purple-700 border-purple-200"
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
        {t.intro(requesterName)}
      </Text>

      {/* Requester Info */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-3 uppercase tracking-wide">
          {t.requesterLabel}
        </Text>
        <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
          {requesterName}
        </Text>
        {requesterTitle && (
          <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mt-1">
            {requesterTitle}
          </Text>
        )}
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={connectionUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={connectionUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {connectionUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ConnectionRequestEmail;
