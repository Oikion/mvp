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

interface ConnectionAcceptedEmailProps {
  recipientName: string;
  acceptedByName: string;
  acceptedByTitle?: string;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: (accepter: string) => `${accepter} accepted your connection request`,
    badge: "Connection Accepted",
    title: "You're Now Connected!",
    subtitle: "Your network just grew",
    greeting: (name: string) => `Hello ${name},`,
    intro: (accepter: string) => `Great news! ${accepter} has accepted your connection request on Oikion.`,
    connectionLabel: "New Connection",
    whatNext: "What's Next?",
    tip1: "View their profile and explore shared interests",
    tip2: "Start a conversation to build your relationship",
    tip3: "Collaborate on properties and deals",
    ctaButton: "View Profile",
    altLink: "Or view at:",
    footer: "You're receiving this because your connection request was accepted.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (accepter: string) => `Ο/Η ${accepter} αποδέχτηκε το αίτημα σύνδεσής σας`,
    badge: "Σύνδεση Αποδεκτή",
    title: "Είστε Πλέον Συνδεδεμένοι!",
    subtitle: "Το δίκτυό σας μεγάλωσε",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (accepter: string) => `Εξαιρετικά νέα! Ο/Η ${accepter} αποδέχτηκε το αίτημα σύνδεσής σας στο Oikion.`,
    connectionLabel: "Νέα Σύνδεση",
    whatNext: "Τι Ακολουθεί;",
    tip1: "Δείτε το προφίλ τους και εξερευνήστε κοινά ενδιαφέροντα",
    tip2: "Ξεκινήστε μια συνομιλία για να χτίσετε τη σχέση σας",
    tip3: "Συνεργαστείτε σε ακίνητα και συμφωνίες",
    ctaButton: "Προβολή Προφίλ",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή το αίτημα σύνδεσής σας έγινε αποδεκτό.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (accepter: string) => `${accepter} přijal vaši žádost o spojení`,
    badge: "Spojení Přijato",
    title: "Jste Nyní Spojeni!",
    subtitle: "Vaše síť se rozrostla",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (accepter: string) => `Skvělé zprávy! ${accepter} přijal vaši žádost o spojení na Oikionu.`,
    connectionLabel: "Nové Spojení",
    whatNext: "Co Dál?",
    tip1: "Prohlédněte si jejich profil a prozkoumejte společné zájmy",
    tip2: "Zahajte konverzaci pro budování vztahu",
    tip3: "Spolupracujte na nemovitostech a obchodech",
    ctaButton: "Zobrazit Profil",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože vaše žádost o spojení byla přijata.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const ConnectionAcceptedEmail = ({
  recipientName,
  acceptedByName,
  acceptedByTitle,
  userLanguage,
  userTheme,
}: ConnectionAcceptedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const networkUrl = `${baseUrl}/app/network`;

  return (
    <BaseLayout
      previewText={t.preview(acceptedByName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="✓"
        text={t.badge}
        colorClass="bg-emerald-50 text-emerald-700 border-emerald-200"
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
        {t.intro(acceptedByName)}
      </Text>

      {/* Connection Info */}
      <Section className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
        <Text className="text-emerald-700 text-xs font-medium m-0 mb-3 uppercase tracking-wide">
          {t.connectionLabel}
        </Text>
        <Text className="text-emerald-900 text-lg font-semibold m-0">
          {acceptedByName}
        </Text>
        {acceptedByTitle && (
          <Text className="text-emerald-700 text-sm m-0 mt-1">
            {acceptedByTitle}
          </Text>
        )}
      </Section>

      {/* Tips */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textPrimary }} className="text-sm font-semibold m-0 mb-3">
          {t.whatNext}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">• {t.tip1}</Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0 mb-2">• {t.tip2}</Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm m-0">• {t.tip3}</Text>
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={networkUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={networkUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {networkUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ConnectionAcceptedEmail;
