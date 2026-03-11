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

type DealStatus = "ACCEPTED" | "COMPLETED" | "CANCELLED" | "IN_PROGRESS" | "NEGOTIATING" | "UPDATED";

interface DealStatusChangedEmailProps {
  recipientName: string;
  actorName: string;
  dealId: string;
  dealTitle?: string;
  propertyName: string;
  clientName?: string;
  status: DealStatus;
  userLanguage: string;
  userTheme?: string;
}

const statusConfig: Record<DealStatus, { icon: string; color: string }> = {
  ACCEPTED: { icon: "✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED: { icon: "🎉", color: "bg-green-50 text-green-700 border-green-200" },
  CANCELLED: { icon: "✕", color: "bg-red-50 text-red-700 border-red-200" },
  IN_PROGRESS: { icon: "⏳", color: "bg-blue-50 text-blue-700 border-blue-200" },
  NEGOTIATING: { icon: "💬", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UPDATED: { icon: "🔄", color: "bg-zinc-50 text-zinc-700 border-zinc-200" },
};

const translations = {
  en: {
    preview: (status: string) => `Deal ${status.toLowerCase().replace("_", " ")}`,
    greeting: (name: string) => `Hello ${name},`,
    dealDetails: "Deal Details",
    propertyLabel: "Property",
    clientLabel: "Client",
    newStatusLabel: "New Status",
    ctaButton: "View Deal",
    altLink: "Or view at:",
    footer: "You're receiving this because of activity on a deal you're involved in.",
    footerNote: "Manage your notification preferences in settings.",
    statuses: {
      ACCEPTED: {
        badge: "Deal Accepted",
        title: "Deal Accepted!",
        subtitle: "Great news - the deal has been accepted",
        intro: (actor: string) => `${actor} has accepted the deal. You can now proceed with the next steps.`,
      },
      COMPLETED: {
        badge: "Deal Completed",
        title: "Deal Completed!",
        subtitle: "Congratulations on closing the deal",
        intro: (actor: string) => `The deal has been marked as completed by ${actor}. Congratulations!`,
      },
      CANCELLED: {
        badge: "Deal Cancelled",
        title: "Deal Cancelled",
        subtitle: "This deal has been cancelled",
        intro: (actor: string) => `${actor} has cancelled the deal. The property is now available again.`,
      },
      IN_PROGRESS: {
        badge: "Deal In Progress",
        title: "Deal Now In Progress",
        subtitle: "The deal is moving forward",
        intro: (actor: string) => `${actor} has moved the deal to in progress status.`,
      },
      NEGOTIATING: {
        badge: "Under Negotiation",
        title: "Deal Under Negotiation",
        subtitle: "Terms are being discussed",
        intro: (actor: string) => `${actor} has updated the deal status to negotiating.`,
      },
      UPDATED: {
        badge: "Deal Updated",
        title: "Deal Updated",
        subtitle: "There are changes to the deal",
        intro: (actor: string) => `${actor} has made updates to the deal.`,
      },
    },
  },
  el: {
    preview: (status: string) => `Συμφωνία ${status.toLowerCase().replace("_", " ")}`,
    greeting: (name: string) => `Γεια σας ${name},`,
    dealDetails: "Λεπτομέρειες Συμφωνίας",
    propertyLabel: "Ακίνητο",
    clientLabel: "Πελάτης",
    newStatusLabel: "Νέα Κατάσταση",
    ctaButton: "Προβολή Συμφωνίας",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό λόγω δραστηριότητας σε συμφωνία στην οποία συμμετέχετε.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
    statuses: {
      ACCEPTED: {
        badge: "Συμφωνία Αποδεκτή",
        title: "Η Συμφωνία Έγινε Αποδεκτή!",
        subtitle: "Εξαιρετικά νέα - η συμφωνία έγινε αποδεκτή",
        intro: (actor: string) => `Ο/Η ${actor} αποδέχτηκε τη συμφωνία. Μπορείτε τώρα να προχωρήσετε στα επόμενα βήματα.`,
      },
      COMPLETED: {
        badge: "Συμφωνία Ολοκληρώθηκε",
        title: "Η Συμφωνία Ολοκληρώθηκε!",
        subtitle: "Συγχαρητήρια για το κλείσιμο της συμφωνίας",
        intro: (actor: string) => `Η συμφωνία επισημάνθηκε ως ολοκληρωμένη από τον/την ${actor}. Συγχαρητήρια!`,
      },
      CANCELLED: {
        badge: "Συμφωνία Ακυρώθηκε",
        title: "Η Συμφωνία Ακυρώθηκε",
        subtitle: "Αυτή η συμφωνία ακυρώθηκε",
        intro: (actor: string) => `Ο/Η ${actor} ακύρωσε τη συμφωνία. Το ακίνητο είναι πλέον διαθέσιμο ξανά.`,
      },
      IN_PROGRESS: {
        badge: "Σε Εξέλιξη",
        title: "Η Συμφωνία Είναι σε Εξέλιξη",
        subtitle: "Η συμφωνία προχωράει",
        intro: (actor: string) => `Ο/Η ${actor} μετέφερε τη συμφωνία σε κατάσταση εξέλιξης.`,
      },
      NEGOTIATING: {
        badge: "Υπό Διαπραγμάτευση",
        title: "Συμφωνία Υπό Διαπραγμάτευση",
        subtitle: "Οι όροι συζητούνται",
        intro: (actor: string) => `Ο/Η ${actor} ενημέρωσε την κατάσταση της συμφωνίας σε διαπραγμάτευση.`,
      },
      UPDATED: {
        badge: "Συμφωνία Ενημερώθηκε",
        title: "Η Συμφωνία Ενημερώθηκε",
        subtitle: "Υπάρχουν αλλαγές στη συμφωνία",
        intro: (actor: string) => `Ο/Η ${actor} έκανε ενημερώσεις στη συμφωνία.`,
      },
    },
  },
  cz: {
    preview: (status: string) => `Obchod ${status.toLowerCase().replace("_", " ")}`,
    greeting: (name: string) => `Dobrý den ${name},`,
    dealDetails: "Detaily Obchodu",
    propertyLabel: "Nemovitost",
    clientLabel: "Klient",
    newStatusLabel: "Nový Stav",
    ctaButton: "Zobrazit Obchod",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte kvůli aktivitě na obchodu, kterého se účastníte.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
    statuses: {
      ACCEPTED: {
        badge: "Obchod Přijat",
        title: "Obchod Přijat!",
        subtitle: "Skvělé zprávy - obchod byl přijat",
        intro: (actor: string) => `${actor} přijal obchod. Můžete nyní pokračovat dalšími kroky.`,
      },
      COMPLETED: {
        badge: "Obchod Dokončen",
        title: "Obchod Dokončen!",
        subtitle: "Gratulujeme k uzavření obchodu",
        intro: (actor: string) => `Obchod byl označen jako dokončený uživatelem ${actor}. Gratulujeme!`,
      },
      CANCELLED: {
        badge: "Obchod Zrušen",
        title: "Obchod Zrušen",
        subtitle: "Tento obchod byl zrušen",
        intro: (actor: string) => `${actor} zrušil obchod. Nemovitost je nyní opět dostupná.`,
      },
      IN_PROGRESS: {
        badge: "Obchod Probíhá",
        title: "Obchod Nyní Probíhá",
        subtitle: "Obchod se posouvá vpřed",
        intro: (actor: string) => `${actor} posunul obchod do stavu probíhající.`,
      },
      NEGOTIATING: {
        badge: "Probíhá Jednání",
        title: "Obchod ve Fázi Jednání",
        subtitle: "Podmínky se projednávají",
        intro: (actor: string) => `${actor} aktualizoval stav obchodu na jednání.`,
      },
      UPDATED: {
        badge: "Obchod Aktualizován",
        title: "Obchod Aktualizován",
        subtitle: "V obchodu jsou změny",
        intro: (actor: string) => `${actor} provedl aktualizace obchodu.`,
      },
    },
  },
};

export const DealStatusChangedEmail = ({
  recipientName,
  actorName,
  dealId,
  dealTitle,
  propertyName,
  clientName,
  status,
  userLanguage,
  userTheme,
}: DealStatusChangedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const statusT = t.statuses[status] || t.statuses.UPDATED;
  const statusStyle = statusConfig[status] || statusConfig.UPDATED;
  const dealUrl = `${baseUrl}/app/deals/${dealId}`;

  return (
    <BaseLayout
      previewText={t.preview(status)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon={statusStyle.icon}
        text={statusT.badge}
        colorClass={statusStyle.color}
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {statusT.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {statusT.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {statusT.intro(actorName)}
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

        {clientName && (
          <Section className="mb-3">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.clientLabel}
            </Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-medium m-0">
              👤 {clientName}
            </Text>
          </Section>
        )}

        <Section>
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.newStatusLabel}
          </Text>
          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded border ${statusStyle.color}`}>
            {statusT.badge}
          </span>
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

export default DealStatusChangedEmail;
