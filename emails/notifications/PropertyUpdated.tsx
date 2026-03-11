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

type UpdateType = "UPDATED" | "DELETED";

interface PropertyUpdatedEmailProps {
  recipientName: string;
  actorName: string;
  propertyId: string;
  propertyFriendlyId?: string;
  propertyName: string;
  propertyAddress?: string;
  updateType: UpdateType;
  changes?: string[];
  userLanguage: string;
  userTheme?: string;
}

const updateConfig: Record<UpdateType, { icon: string; color: string }> = {
  UPDATED: { icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-200" },
  DELETED: { icon: "🗑️", color: "bg-red-50 text-red-700 border-red-200" },
};

const translations = {
  en: {
    preview: {
      UPDATED: (property: string) => `Property "${property}" was updated`,
      DELETED: (property: string) => `Property "${property}" was deleted`,
    },
    badge: {
      UPDATED: "Property Updated",
      DELETED: "Property Deleted",
    },
    title: {
      UPDATED: "Property Updated",
      DELETED: "Property Deleted",
    },
    subtitle: {
      UPDATED: "Changes were made to a property you're watching",
      DELETED: "A property you were watching has been deleted",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `${actor} made changes to the property "${property}" that you're watching.`,
      DELETED: (actor: string, property: string) => `${actor} has deleted the property "${property}" that you were watching.`,
    },
    propertyDetails: "Property Details",
    propertyNameLabel: "Property Name",
    addressLabel: "Address",
    changesLabel: "Changes Made",
    ctaButton: "View Property",
    altLink: "Or view at:",
    footer: "You're receiving this because you're watching this property.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      UPDATED: (property: string) => `Το ακίνητο "${property}" ενημερώθηκε`,
      DELETED: (property: string) => `Το ακίνητο "${property}" διαγράφηκε`,
    },
    badge: {
      UPDATED: "Ενημέρωση Ακινήτου",
      DELETED: "Διαγραφή Ακινήτου",
    },
    title: {
      UPDATED: "Το Ακίνητο Ενημερώθηκε",
      DELETED: "Το Ακίνητο Διαγράφηκε",
    },
    subtitle: {
      UPDATED: "Έγιναν αλλαγές σε ακίνητο που παρακολουθείτε",
      DELETED: "Ένα ακίνητο που παρακολουθούσατε διαγράφηκε",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `Ο/Η ${actor} έκανε αλλαγές στο ακίνητο "${property}" που παρακολουθείτε.`,
      DELETED: (actor: string, property: string) => `Ο/Η ${actor} διέγραψε το ακίνητο "${property}" που παρακολουθούσατε.`,
    },
    propertyDetails: "Στοιχεία Ακινήτου",
    propertyNameLabel: "Όνομα Ακινήτου",
    addressLabel: "Διεύθυνση",
    changesLabel: "Αλλαγές που Έγιναν",
    ctaButton: "Προβολή Ακινήτου",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή παρακολουθείτε αυτό το ακίνητο.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      UPDATED: (property: string) => `Nemovitost "${property}" byla aktualizována`,
      DELETED: (property: string) => `Nemovitost "${property}" byla smazána`,
    },
    badge: {
      UPDATED: "Nemovitost Aktualizována",
      DELETED: "Nemovitost Smazána",
    },
    title: {
      UPDATED: "Nemovitost Aktualizována",
      DELETED: "Nemovitost Smazána",
    },
    subtitle: {
      UPDATED: "Byly provedeny změny u nemovitosti, kterou sledujete",
      DELETED: "Nemovitost, kterou jste sledovali, byla smazána",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      UPDATED: (actor: string, property: string) => `${actor} provedl změny u nemovitosti "${property}", kterou sledujete.`,
      DELETED: (actor: string, property: string) => `${actor} smazal nemovitost "${property}", kterou jste sledovali.`,
    },
    propertyDetails: "Detaily Nemovitosti",
    propertyNameLabel: "Název Nemovitosti",
    addressLabel: "Adresa",
    changesLabel: "Provedené Změny",
    ctaButton: "Zobrazit Nemovitost",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože sledujete tuto nemovitost.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const PropertyUpdatedEmail = ({
  recipientName,
  actorName,
  propertyId,
  propertyFriendlyId,
  propertyName,
  propertyAddress,
  updateType,
  changes,
  userLanguage,
  userTheme,
}: PropertyUpdatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const config = updateConfig[updateType];
  const propertyUrl = `${baseUrl}/app/properties/${propertyFriendlyId ?? propertyId}`;

  return (
    <BaseLayout
      previewText={t.preview[updateType](propertyName)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon={config.icon}
        text={t.badge[updateType]}
        colorClass={config.color}
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title[updateType]}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle[updateType]}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro[updateType](actorName, propertyName)}
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
          <Text
            style={{ color: updateType === "DELETED" ? colors.textMuted : colors.textPrimary }}
            className={`text-lg font-semibold m-0 ${updateType === "DELETED" ? "line-through" : ""}`}
          >
            🏠 {propertyName}
          </Text>
        </Section>

        {propertyAddress && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.addressLabel}
            </Text>
            <Text
              style={{ color: updateType === "DELETED" ? colors.textMuted : colors.textSecondary }}
              className={`text-sm m-0 ${updateType === "DELETED" ? "line-through" : ""}`}
            >
              📍 {propertyAddress}
            </Text>
          </Section>
        )}

        {changes && changes.length > 0 && updateType === "UPDATED" && (
          <Section>
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-2">
              {t.changesLabel}
            </Text>
            {changes.map((change, index) => (
              <Text key={index} style={{ color: colors.textSecondary }} className="text-sm m-0 mb-1">
                • {change}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      {updateType !== "DELETED" && (
        <>
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
        </>
      )}
    </BaseLayout>
  );
};

export default PropertyUpdatedEmail;
