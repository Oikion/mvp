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

interface PropertyCreatedEmailProps {
  recipientName: string;
  creatorName: string;
  propertyId: string;
  propertyFriendlyId?: string;
  propertyName: string;
  propertyAddress?: string;
  isAssigned?: boolean;
  userLanguage: string;
  userTheme?: string;
}

const translations = {
  en: {
    preview: {
      created: (creator: string) => `${creator} added a new property`,
      assigned: (creator: string) => `${creator} assigned a property to you`,
    },
    badge: {
      created: "New Property",
      assigned: "Property Assigned",
    },
    title: {
      created: "New Property Added",
      assigned: "Property Assigned to You",
    },
    subtitle: {
      created: "A new property has been added to the portfolio",
      assigned: "You've been assigned to manage this property",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      created: (creator: string) => `${creator} has added a new property to your organization's portfolio.`,
      assigned: (creator: string) => `${creator} has assigned a property to you. You are now responsible for managing this listing.`,
    },
    propertyDetails: "Property Details",
    propertyNameLabel: "Property Name",
    addressLabel: "Address",
    ctaButton: "View Property",
    altLink: "Or view at:",
    footer: {
      created: "You're receiving this because a new property was added to your organization.",
      assigned: "You're receiving this because a property was assigned to you.",
    },
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε ένα νέο ακίνητο`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε ένα ακίνητο`,
    },
    badge: {
      created: "Νέο Ακίνητο",
      assigned: "Ανάθεση Ακινήτου",
    },
    title: {
      created: "Νέο Ακίνητο Προστέθηκε",
      assigned: "Ακίνητο Ανατέθηκε σε Εσάς",
    },
    subtitle: {
      created: "Ένα νέο ακίνητο προστέθηκε στο χαρτοφυλάκιο",
      assigned: "Σας ανατέθηκε να διαχειριστείτε αυτό το ακίνητο",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      created: (creator: string) => `Ο/Η ${creator} πρόσθεσε ένα νέο ακίνητο στο χαρτοφυλάκιο του οργανισμού σας.`,
      assigned: (creator: string) => `Ο/Η ${creator} σας ανέθεσε ένα ακίνητο. Είστε πλέον υπεύθυνοι για τη διαχείριση αυτής της καταχώρισης.`,
    },
    propertyDetails: "Στοιχεία Ακινήτου",
    propertyNameLabel: "Όνομα Ακινήτου",
    addressLabel: "Διεύθυνση",
    ctaButton: "Προβολή Ακινήτου",
    altLink: "Ή δείτε στο:",
    footer: {
      created: "Λαμβάνετε αυτό επειδή προστέθηκε ένα νέο ακίνητο στον οργανισμό σας.",
      assigned: "Λαμβάνετε αυτό επειδή σας ανατέθηκε ένα ακίνητο.",
    },
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      created: (creator: string) => `${creator} přidal novou nemovitost`,
      assigned: (creator: string) => `${creator} vám přiřadil nemovitost`,
    },
    badge: {
      created: "Nová Nemovitost",
      assigned: "Nemovitost Přiřazena",
    },
    title: {
      created: "Nová Nemovitost Přidána",
      assigned: "Nemovitost Přiřazena Vám",
    },
    subtitle: {
      created: "Nová nemovitost byla přidána do portfolia",
      assigned: "Byli jste pověřeni správou této nemovitosti",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      created: (creator: string) => `${creator} přidal novou nemovitost do portfolia vaší organizace.`,
      assigned: (creator: string) => `${creator} vám přiřadil nemovitost. Nyní jste zodpovědní za správu tohoto inzerátu.`,
    },
    propertyDetails: "Detaily Nemovitosti",
    propertyNameLabel: "Název Nemovitosti",
    addressLabel: "Adresa",
    ctaButton: "Zobrazit Nemovitost",
    altLink: "Nebo zobrazte na:",
    footer: {
      created: "Tento email dostáváte, protože byla přidána nová nemovitost do vaší organizace.",
      assigned: "Tento email dostáváte, protože vám byla přiřazena nemovitost.",
    },
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const PropertyCreatedEmail = ({
  recipientName,
  creatorName,
  propertyId,
  propertyFriendlyId,
  propertyName,
  propertyAddress,
  isAssigned = false,
  userLanguage,
  userTheme,
}: PropertyCreatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const type = isAssigned ? "assigned" : "created";
  const propertyUrl = `${baseUrl}/app/properties/${propertyFriendlyId ?? propertyId}`;

  return (
    <BaseLayout
      previewText={t.preview[type](creatorName)}
      footerText={`${t.footer[type]} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="🏠"
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

      {/* Property Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.propertyDetails}
        </Text>

        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.propertyNameLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-lg font-semibold m-0">
            {propertyName}
          </Text>
        </Section>

        {propertyAddress && (
          <Section>
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.addressLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0">
              📍 {propertyAddress}
            </Text>
          </Section>
        )}
      </Section>

      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={propertyUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={propertyUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {propertyUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default PropertyCreatedEmail;
