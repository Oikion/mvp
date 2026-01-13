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

type UpdateType = "UPDATED" | "DELETED";

interface AccountUpdatedEmailProps {
  recipientName: string;
  actorName: string;
  accountId: string;
  accountName: string;
  updateType: UpdateType;
  changes?: string[];
  userLanguage: string;
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
}: AccountUpdatedEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const config = updateConfig[updateType];
  const accountUrl = `${baseUrl}/app/crm/accounts/${accountId}`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview[updateType](accountName)}</Preview>
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
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${config.color}`}>
                  {config.icon} {t.badge[updateType]}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title[updateType]}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle[updateType]}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro[updateType](actorName, accountName)}
              </Text>

              {/* Account Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.accountDetails}
                </Text>

                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.accountNameLabel}
                  </Text>
                  <Text className={`text-lg font-semibold m-0 ${updateType === "DELETED" ? "line-through text-zinc-500" : "text-zinc-900"}`}>
                    👤 {accountName}
                  </Text>
                </Section>

                {changes && changes.length > 0 && updateType === "UPDATED" && (
                  <Section>
                    <Text className="text-zinc-500 text-xs m-0 mb-2">
                      {t.changesLabel}
                    </Text>
                    {changes.map((change, index) => (
                      <Text key={index} className="text-zinc-700 text-sm m-0 mb-1">
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
                      className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                      href={accountUrl}
                    >
                      {t.ctaButton}
                    </Button>
                  </Section>

                  {/* Alternative Link */}
                  <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                    {t.altLink}
                  </Text>
                  <Text className="text-center m-0">
                    <Link href={accountUrl} className="text-blue-600 text-xs underline break-all">
                      {accountUrl}
                    </Link>
                  </Text>
                </>
              )}
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

export default AccountUpdatedEmail;
