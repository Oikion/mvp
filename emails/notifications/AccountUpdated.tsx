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

interface AccountUpdatedEmailProps {
  recipientName: string;
  actorName: string;
  accountId: string;
  accountName: string;
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
      UPDATED: (account: string) => `Account "${account}" was updated`,
      DELETED: (account: string) => `Account "${account}" was deleted`,
    },
    badge: {
      UPDATED: "Account Updated",
      DELETED: "Account Deleted",
    },
    title: {
      UPDATED: "Account Updated",
      DELETED: "Account Deleted",
    },
    subtitle: {
      UPDATED: "Changes were made to an account you're watching",
      DELETED: "An account you were watching has been deleted",
    },
    greeting: (name: string) => `Hello ${name},`,
    intro: {
      UPDATED: (actor: string, account: string) => `${actor} made changes to the account "${account}" that you're watching.`,
      DELETED: (actor: string, account: string) => `${actor} has deleted the account "${account}" that you were watching.`,
    },
    accountDetails: "Account Details",
    accountNameLabel: "Account Name",
    changesLabel: "Changes Made",
    ctaButton: "View Account",
    altLink: "Or view at:",
    footer: "You're receiving this because you're watching this account.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: {
      UPDATED: (account: string) => `Ο λογαριασμός "${account}" ενημερώθηκε`,
      DELETED: (account: string) => `Ο λογαριασμός "${account}" διαγράφηκε`,
    },
    badge: {
      UPDATED: "Ενημέρωση Λογαριασμού",
      DELETED: "Διαγραφή Λογαριασμού",
    },
    title: {
      UPDATED: "Ο Λογαριασμός Ενημερώθηκε",
      DELETED: "Ο Λογαριασμός Διαγράφηκε",
    },
    subtitle: {
      UPDATED: "Έγιναν αλλαγές σε λογαριασμό που παρακολουθείτε",
      DELETED: "Ένας λογαριασμός που παρακολουθούσατε διαγράφηκε",
    },
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: {
      UPDATED: (actor: string, account: string) => `Ο/Η ${actor} έκανε αλλαγές στον λογαριασμό "${account}" που παρακολουθείτε.`,
      DELETED: (actor: string, account: string) => `Ο/Η ${actor} διέγραψε τον λογαριασμό "${account}" που παρακολουθούσατε.`,
    },
    accountDetails: "Στοιχεία Λογαριασμού",
    accountNameLabel: "Όνομα Λογαριασμού",
    changesLabel: "Αλλαγές που Έγιναν",
    ctaButton: "Προβολή Λογαριασμού",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή παρακολουθείτε αυτόν τον λογαριασμό.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: {
      UPDATED: (account: string) => `Účet "${account}" byl aktualizován`,
      DELETED: (account: string) => `Účet "${account}" byl smazán`,
    },
    badge: {
      UPDATED: "Účet Aktualizován",
      DELETED: "Účet Smazán",
    },
    title: {
      UPDATED: "Účet Aktualizován",
      DELETED: "Účet Smazán",
    },
    subtitle: {
      UPDATED: "Byly provedeny změny u účtu, který sledujete",
      DELETED: "Účet, který jste sledovali, byl smazán",
    },
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: {
      UPDATED: (actor: string, account: string) => `${actor} provedl změny u účtu "${account}", který sledujete.`,
      DELETED: (actor: string, account: string) => `${actor} smazal účet "${account}", který jste sledovali.`,
    },
    accountDetails: "Detaily Účtu",
    accountNameLabel: "Název Účtu",
    changesLabel: "Provedené Změny",
    ctaButton: "Zobrazit Účet",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože sledujete tento účet.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const AccountUpdatedEmail = ({
  recipientName,
  actorName,
  accountId,
  accountName,
  updateType,
  changes,
  userLanguage,
  userTheme,
}: AccountUpdatedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const config = updateConfig[updateType];
  const accountUrl = `${baseUrl}/app/crm/accounts/${accountId}`;

  return (
    <BaseLayout
      previewText={t.preview[updateType](accountName)}
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
        {t.intro[updateType](actorName, accountName)}
      </Text>

      {/* Account Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.accountDetails}
        </Text>

        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.accountNameLabel}
          </Text>
          <Text
            style={{ color: updateType === "DELETED" ? colors.textMuted : colors.textPrimary }}
            className={`text-lg font-semibold m-0 ${updateType === "DELETED" ? "line-through" : ""}`}
          >
            👤 {accountName}
          </Text>
        </Section>

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

      {/* CTA Button */}
      {updateType !== "DELETED" && (
        <>
          <Section className="text-center mb-6">
            <Button
              style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
              className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
              href={accountUrl}
            >
              {t.ctaButton}
            </Button>
          </Section>

          <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
            {t.altLink}
          </Text>
          <Text className="text-center m-0">
            <Link href={accountUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
              {accountUrl}
            </Link>
          </Text>
        </>
      )}
    </BaseLayout>
  );
};

export default AccountUpdatedEmail;
