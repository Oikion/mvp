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

interface ClientCreatedEmailProps {
  recipientName: string;
  creatorName: string;
  clientId: string;
  clientName: string;
  isAssigned?: boolean;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: {
      created: (creator: string) => `${creator} added a new client`,
      assigned: (creator: string) => `${creator} assigned a client to you`,
    },
    badge: {
      created: "New Client",
      assigned: "Client Assigned",
    },
    title: {
      created: "New Client Added",
      assigned: "Client Assigned to You",
    },
    subtitle: {
      created: "A new client has been added to the CRM",
      assigned: "You've been assigned to manage this client",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      created: (creator: string) => `${creator} has added a new client to your organization's CRM.`,
      assigned: (creator: string) => `${creator} has assigned a client to you. You are now responsible for managing this relationship.`,
    },
    clientDetails: "Client Details",
    clientNameLabel: "Client Name",
    ctaButton: "View Client",
    altLink: "Or view at:",
    footer: {
      created: "You're receiving this because a new client was added to your organization.",
      assigned: "You're receiving this because a client was assigned to you.",
    },
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε έναν νέο πελάτη`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε έναν πελάτη`,
    },
    badge: {
      created: "Νέος Πελάτης",
      assigned: "Ανάθεση Πελάτη",
    },
    title: {
      created: "Νέος Πελάτης Προστέθηκε",
      assigned: "Πελάτης Ανατέθηκε σε Εσάς",
    },
    subtitle: {
      created: "Ένας νέος πελάτης προστέθηκε στο CRM",
      assigned: "Σας ανατέθηκε να διαχειριστείτε αυτόν τον πελάτη",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε έναν νέο πελάτη στο CRM του οργανισμού σας.`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε έναν πελάτη. Είστε πλέον υπεύθυνοι για τη διαχείριση αυτής της σχέσης.`,
    },
    clientDetails: "Στοιχεία Πελάτη",
    clientNameLabel: "Όνομα Πελάτη",
    ctaButton: "Προβολή Πελάτη",
    altLink: "Ή δείτε στο:",
    footer: {
      created: "Λαμβάνετε αυτό επειδή προστέθηκε ένας νέος πελάτης στον οργανισμό σας.",
      assigned: "Λαμβάνετε αυτό επειδή σας ανατέθηκε ένας πελάτης.",
    },
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      created: (creator: string) => `${creator} přidal nového klienta`,
      assigned: (creator: string) => `${creator} vám přiřadil klienta`,
    },
    badge: {
      created: "Nový Klient",
      assigned: "Klient Přiřazen",
    },
    title: {
      created: "Nový Klient Přidán",
      assigned: "Klient Přiřazen Vám",
    },
    subtitle: {
      created: "Nový klient byl přidán do CRM",
      assigned: "Byli jste pověřeni správou tohoto klienta",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      created: (creator: string) => `${creator} přidal nového klienta do CRM vaší organizace.`,
      assigned: (creator: string) => `${creator} vám přiřadil klienta. Nyní jste zodpovědní za správu tohoto vztahu.`,
    },
    clientDetails: "Detaily Klienta",
    clientNameLabel: "Jméno Klienta",
    ctaButton: "Zobrazit Klienta",
    altLink: "Nebo zobrazte na:",
    footer: {
      created: "Tento email dostáváte, protože byl přidán nový klient do vaší organizace.",
      assigned: "Tento email dostáváte, protože vám byl přiřazen klient.",
    },
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const ClientCreatedEmail = ({
  recipientName,
  creatorName,
  clientId,
  clientName,
  isAssigned = false,
  userLanguage,
  userTheme,
}: ClientCreatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const type = isAssigned ? "assigned" : "created";
  const clientUrl = `${baseUrl}/app/crm/accounts/${clientId}`;

  return (
    <BaseLayout
      previewText={t.preview[type](creatorName)}
      footerText={`${t.footer[type]} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="👤"
        text={t.badge[type]}
        colorClass={isAssigned ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title[type]}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle[type]}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro[type](creatorName)}
      </Text>

      {/* Client Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.clientDetails}
        </Text>
        <Section>
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.clientNameLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
            {clientName}
          </Text>
        </Section>
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={clientUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={clientUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {clientUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default ClientCreatedEmail;
